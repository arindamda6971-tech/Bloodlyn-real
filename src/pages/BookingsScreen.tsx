import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Activity,
  Heart,
  Stethoscope,
  TestTube,
  ChevronRight,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { format } from "date-fns";

type Order = {
  id: string;
  order_number: string | null;
  status: string | null;
  scheduled_date: string | null;
  scheduled_time_slot: string | null;
  total: number;
  created_at: string;
  payment_status: string | null;
  test_name: string | null;
  lab_name: string | null;
};

const BookingsScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useRealtimeOrders();

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayStatus = (status: string | null) => {
    switch (status) {
      case "completed":
        return { label: "Report Arrived", color: "bg-success/10 text-success" };
      case "in_progress":
        return { label: "Sample Collected", color: "bg-primary/10 text-primary" };
      case "confirmed":
        return { label: "Confirmed", color: "bg-primary/10 text-primary" };
      case "pending":
        return { label: "Confirmed", color: "bg-warning/10 text-warning" };
      case "cancelled":
        return { label: "Cancelled", color: "bg-destructive/10 text-destructive" };
      default:
        return { label: status || "Unknown", color: "bg-muted text-muted-foreground" };
    }
  };

  const getBookingIcon = (orderNumber: string | null) => {
    if (orderNumber?.startsWith("ECG")) return Activity;
    if (orderNumber?.startsWith("PHY")) return Heart;
    if (orderNumber?.startsWith("DOC")) return Stethoscope;
    return TestTube;
  };

  const getBookingType = (orderNumber: string | null) => {
    if (orderNumber?.startsWith("ECG")) return "ECG Test";
    if (orderNumber?.startsWith("PHY")) return "Physiotherapy";
    if (orderNumber?.startsWith("DOC")) return "Consultation";
    return "Lab Test";
  };

  const handleOrderClick = (order: Order) => {
    if (order.status === "completed") {
      // Navigate to reports for completed orders
      navigate("/reports");
    } else {
      navigate(`/tracking/${order.id}`);
    }
  };

  const renderOrderCard = (order: Order, index: number) => {
    const BookingIcon = getBookingIcon(order.order_number);
    const bookingType = getBookingType(order.order_number);
    const statusInfo = getDisplayStatus(order.status);

    return (
      <motion.div
        key={order.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="soft-card cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => handleOrderClick(order)}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookingIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground text-sm">{order.test_name || bookingType}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.order_number || `#${order.id.slice(0, 8)}`}
                </p>
                {order.lab_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{order.lab_name}</p>
                )}
              </div>
              <Badge className={`text-[10px] shrink-0 ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
            </div>

            <div className="mt-3 space-y-1.5">
              {order.scheduled_date && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{format(new Date(order.scheduled_date), "MMM dd, yyyy")}</span>
                </div>
              )}
              {order.scheduled_time_slot && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{order.scheduled_time_slot}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="font-semibold text-foreground">₹{order.total}</span>
              <div className="flex items-center gap-1 text-xs text-primary font-medium">
                {order.status === "completed" ? "View Report" : "Track Order"}
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <MobileLayout>
      <ScreenHeader title="My Orders" showBack={false} />

      <div className="px-4 pb-6">
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="soft-card animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length > 0 ? (
            orders.map((order, idx) => renderOrderCard(order, idx))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No Orders Yet</h3>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                You haven't placed any orders yet. Book a test to get started!
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default BookingsScreen;
