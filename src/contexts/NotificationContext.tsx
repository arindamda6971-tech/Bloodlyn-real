import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "order" | "report" | "promo" | "system";
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, "id" | "read" | "created_at">) => void;
  clearNotifications: () => void;
  smartAlertsEnabled: boolean;
  setSmartAlertsEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Use sessionStorage for sensitive health notifications - clears when browser tab closes
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const stored = sessionStorage.getItem("bloodlyn-notifications");
    return stored ? JSON.parse(stored) : [];
  });

  const [smartAlertsEnabled, setSmartAlertsEnabled] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("bloodlyn-smart-alerts", JSON.stringify(false));
  }, [smartAlertsEnabled]);

  // Auto-expire old notifications (7 days) and save to sessionStorage
  useEffect(() => {
    const MAX_NOTIFICATION_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();
    const filtered = notifications.filter(n => {
      const age = now - new Date(n.created_at).getTime();
      return age < MAX_NOTIFICATION_AGE;
    });
    
    // Only update if there are expired notifications to remove
    if (filtered.length !== notifications.length) {
      setNotifications(filtered);
    }
    
    sessionStorage.setItem("bloodlyn-notifications", JSON.stringify(filtered));
  }, [notifications]);

  // Listen for new orders in real-time
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`orders-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const order = payload.new as { order_number: string; status: string };
          addNotification({
            title: "Booking Confirmed! 🩸",
            message: "Home sample collection scheduled. A certified phlebotomist will arrive at your address.",
            type: "order",
            data: { orderId: (payload.new as { id: string }).id, orderNumber: order.order_number },
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const order = payload.new as { order_number: string; status: string };
          const oldStatus = (payload.old as { status: string })?.status;
          
          if (order.status !== oldStatus) {
            let title = "Order Update";
            let message = "";
            switch (order.status) {
              case "confirmed":
                title = "Phlebotomist Assigned 🩺";
                message = "Your sample collection slot is confirmed. Tap to track live status.";
                break;
              case "collected":
                title = "Sample Collected Safely 🧪";
                message = "Your sample is on the way to the NABL-certified diagnostic lab.";
                break;
              case "processing":
                title = "Lab Testing in Progress 🔬";
                message = "The diagnostic center is processing your sample. Accurate report in progress.";
                break;
              case "completed":
                title = "Diagnostic Report Ready! 📄";
                message = "Your verified test report is ready. Tap to view and download.";
                break;
              default:
                title = "Booking Status Updated";
                message = `Your booking status is now ${order.status}.`;
            }
            
            addNotification({
              title,
              message,
              type: "order",
              data: { orderId: (payload.new as { id: string }).id, orderNumber: order.order_number },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const playChime = useCallback((type: Notification["type"]) => {
    if (type !== "order" && type !== "report") return;
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const tones = type === "order" ? [880, 1320] : [660, 990];
      tones.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.3);
      });
      setTimeout(() => ctx.close().catch(() => {}), 800);
    } catch { /* silently ignore — autoplay may be blocked until first gesture */ }
  }, []);

  // Request permission on mount for native devices
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions();
    }
  }, []);

  const addNotification = useCallback(async (notification: Omit<Notification, "id" | "read" | "created_at">) => {
    if (!smartAlertsEnabled && notification.type !== "order") {
      return;
    }

    const id = crypto.randomUUID();
    const newNotification: Notification = {
      ...notification,
      id: id,
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
    playChime(notification.type);

    // Trigger native notification if on device
    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerms = await LocalNotifications.checkPermissions();
        if (hasPerms.display === 'granted') {
          await LocalNotifications.schedule({
            notifications: [
              {
                title: notification.title,
                body: notification.message,
                id: Math.floor(Math.random() * 1000000),
                schedule: { at: new Date(Date.now() + 1000) },
                sound: 'beep.wav',
                smallIcon: 'ic_stat_bloodlyn',
                largeIcon: 'splash_icon',
                iconColor: '#4AB3F4',
                attachments: [],
                actionTypeId: '',
                extra: notification.data
              }
            ]
          });
        }
      } catch (err) {
        console.error("Failed to show native notification:", err);
      }
    }
  }, [smartAlertsEnabled, playChime]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      addNotification,
      clearNotifications,
      smartAlertsEnabled,
      setSmartAlertsEnabled,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications, unreadCount, smartAlertsEnabled]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
