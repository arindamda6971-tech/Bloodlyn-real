import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Use sessionStorage for sensitive health notifications - clears when browser tab closes
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const stored = sessionStorage.getItem("bloodlyn-notifications");
    return stored ? JSON.parse(stored) : [];
  });

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
      .channel("orders-notifications")
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
            title: "Test Booked Successfully!",
            message: `Your order #${order.order_number || "N/A"} has been placed.`,
            type: "order",
            data: { orderId: (payload.new as { id: string }).id },
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
            let message = "";
            switch (order.status) {
              case "confirmed":
                message = "Your sample collection has been confirmed.";
                break;
              case "collected":
                message = "Your sample has been collected successfully.";
                break;
              case "processing":
                message = "Your sample is being processed at the lab.";
                break;
              case "completed":
                message = "Your test report is ready!";
                break;
              default:
                message = `Order status updated to ${order.status}`;
            }
            
            addNotification({
              title: "Order Update",
              message: `Order #${order.order_number}: ${message}`,
              type: "order",
              data: { orderId: (payload.new as { id: string }).id },
            });
          }
        }
      )
      .subscribe();

    // Also listen for new reports
    const reportsChannel = supabase
      .channel("reports-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reports",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const report = payload.new as { status: string };
          if (report.status === "completed") {
            addNotification({
              title: "Report Ready!",
              message: "Your health report is now available with AI insights.",
              type: "report",
              data: { reportId: (payload.new as { id: string }).id },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reportsChannel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const playChime = (type: Notification["type"]) => {
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
  };

  // Request permission on mount for native devices
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions();
    }
  }, []);

  const addNotification = async (notification: Omit<Notification, "id" | "read" | "created_at">) => {
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
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
