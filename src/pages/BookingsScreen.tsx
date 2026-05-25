import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Activity,
  Heart,
  Stethoscope,
  TestTube,
  ChevronRight,
  Package,
  Search,
  X,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { format } from "date-fns";
import { useSEO } from "@/hooks/useSEO";

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

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "Collected" },
  { key: "completed", label: "Report Ready" },
  { key: "cancelled", label: "Cancelled" },
] as const;

const BookingsScreen = () => {
  useSEO({ title: "My Orders | BloodLyn", description: "Track your diagnostic test orders, sample collection status and view past bookings." });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

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

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeFilter !== "all") {
      if (activeFilter === "confirmed") {
        result = result.filter((o) => o.status === "confirmed" || o.status === "pending");
      } else {
        result = result.filter((o) => o.status === activeFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.test_name?.toLowerCase().includes(q) ||
          o.order_number?.toLowerCase().includes(q) ||
          o.lab_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, activeFilter, searchQuery]);

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
        exit={{ opacity: 0, y: -8 }}
        transition={{ delay: index * 0.04 }}
        layout
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
                <p className="text-[11px] text-muted-foreground/90 mt-0.5">
                  Booked on {format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}
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
        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by test, order #, or lab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-xl bg-muted/50 border-none text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
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
          ) : filteredOrders.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order, idx) => renderOrderCard(order, idx))}
            </AnimatePresence>
          ) : orders.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Filter className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1">No matching orders</h3>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Try a different search term or filter.
              </p>
            </motion.div>
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
