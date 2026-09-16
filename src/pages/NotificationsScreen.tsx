import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ShoppingBag,
  FileText,
  Gift,
  Info,
  Check,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";

const ICONS: Record<Notification["type"], any> = {
  order: ShoppingBag,
  report: FileText,
  promo: Gift,
  system: Info,
};

const COLOR_CLASSES: Record<Notification["type"], string> = {
  order: "from-primary/20 to-primary/5 text-primary ring-primary/20",
  report: "from-success/20 to-success/5 text-success ring-success/20",
  promo: "from-warning/20 to-warning/5 text-warning ring-warning/20",
  system: "from-muted to-muted/30 text-muted-foreground ring-border",
};

const groupKey = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return "Earlier";
};

const NotificationsScreen = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, clearNotifications, unreadCount } =
    useNotifications();

  const grouped = useMemo(() => {
    const map = new Map<string, Notification[]>();
    notifications.forEach((n) => {
      const k = groupKey(n.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(n);
    });
    return Array.from(map.entries());
  }, [notifications]);

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.type === "order" && n.data?.orderId) {
      navigate(`/tracking/${n.data.orderId}`);
    } else if (n.type === "report" && n.data?.reportId) {
      navigate("/report-detail", { state: { reportId: n.data.reportId } });
    }
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader
        title="Notifications"
        rightAction={
          notifications.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotifications}
              className="text-destructive hover:text-destructive h-8 text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear all
            </Button>
          ) : undefined
        }
      />

      <div className="px-4 pb-10">
        {notifications.length === 0 ? (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 text-center"
          >
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/15 flex items-center justify-center mb-5">
              <Bell className="w-12 h-12 text-primary/70" />
            </div>
            <h2 className="text-lg font-bold text-foreground">No notifications yet</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
              Book a test or upload a prescription — we'll keep you posted here.
            </p>
            <Button variant="hero" className="mt-6" onClick={() => navigate("/home")}>
              Book a Test
            </Button>
          </motion.div>
        ) : (
          <>

            <AnimatePresence initial={false}>
              {grouped.map(([label, items]) => (
                <div key={label} className="mb-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground/80 px-1 mb-2">
                    {label}
                  </p>
                  <div className="space-y-2.5">
                    {items.map((n, i) => {
                      const Icon = ICONS[n.type];
                      return (
                        <motion.button
                          key={n.id}
                          layout
                          initial={false}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ delay: 0}}
                          onClick={() => handleClick(n)}
                          className={`relative w-full text-left rounded-2xl border border-border/70 bg-card p-3.5 pr-4 flex items-start gap-3 active:scale-[0.985] transition-all overflow-hidden ${
                            !n.read ? "shadow-sm" : "opacity-80"
                          }`}
                        >
                          {!n.read && (
                            <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary" />
                          )}
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ring-1 flex items-center justify-center flex-shrink-0 ${COLOR_CLASSES[n.type]}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm leading-tight ${
                                  !n.read ? "font-semibold text-foreground" : "text-foreground/80"
                                }`}
                              >
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                              {n.message}
                            </p>
                            <p className="text-[11px] text-muted-foreground/80 mt-2">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default NotificationsScreen;
