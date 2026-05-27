import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Calendar, Clock, Activity, Heart, Stethoscope, TestTube, ChevronRight,
  Package, Search, X, Filter, ArrowLeft, RotateCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
<<<<<<< HEAD
import StickySearch from "@/components/ui/StickySearch";
=======
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)
import MobileLayout from "@/components/layout/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { format } from "date-fns";
import { useSEO } from "@/hooks/useSEO";
<<<<<<< HEAD
import { formatTestsLabel } from "@/lib/format-tests";

=======
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)

type Order = {
  id: string; order_number: string | null; status: string | null;
  scheduled_date: string | null; scheduled_time_slot: string | null;
  total: number; created_at: string; payment_status: string | null;
  test_name: string | null; lab_name: string | null;
};

const STATUS_FILTERS = [
  { key: "all", label: "All" }, { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "Collected" }, { key: "completed", label: "Report Ready" },
  { key: "cancelled", label: "Cancelled" },
] as const;

const BookingsScreen = () => {
  useSEO({ title: "My Orders | BloodLyn", description: "Track your diagnostic test orders." });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 80], [130, 70]);
  const titleOpacity = useTransform(scrollY, [0, 40], [1, 0]);
  const titleScale = useTransform(scrollY, [0, 40], [1, 0.8]);
  const searchY = useTransform(scrollY, [0, 80], [0, -45]);

  useRealtimeOrders();
  const fetchOrders = async () => {
    try {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user) fetchOrders(); }, [user]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (activeFilter !== "all") {
      result = activeFilter === "confirmed" ? result.filter(o => o.status === "confirmed" || o.status === "pending") : result.filter(o => o.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => o.test_name?.toLowerCase().includes(q) || o.order_number?.toLowerCase().includes(q) || o.lab_name?.toLowerCase().includes(q));
    }
    return result;
  }, [orders, activeFilter, searchQuery]);

<<<<<<< HEAD
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
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">{formatTestsLabel(order.test_name, bookingType)}</h3>
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
      <StickySearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by test, order #, or lab..."
      />

      <div className="px-4 pb-6">

        {/* Status Filter Chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
=======
  return (
    <MobileLayout>
      <motion.header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 overflow-hidden"
        style={{ height: headerHeight, paddingTop: "calc(env(safe-area-inset-top, 24px) + 8px)" }}
      >
        <motion.div style={{ opacity: titleOpacity, scale: titleScale, originX: 0 }} className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center border border-white/20 shadow-sm"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-black text-foreground tracking-tight">My Orders</h1>
        </motion.div>
        <motion.div style={{ y: searchY }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input type="text" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/50 backdrop-blur-md rounded-2xl py-3.5 pl-11 pr-10 text-sm font-medium border border-white/20 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 z-10"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </motion.div>
      </motion.header>

      <div className="px-6 pb-24">
        <div className="flex gap-2.5 mt-6 overflow-x-auto pb-2 scrollbar-hide">
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all whitespace-nowrap ${activeFilter === f.key ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/50 text-muted-foreground border border-white/20"}`}>{f.label}</button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {loading ? [1,2,3].map(i => <div key={i} className="soft-card h-32 animate-pulse bg-muted/50 rounded-[2rem]" />) : filteredOrders.map((order, idx) => (
            <motion.div key={order.id} whileTap={{ scale: 0.98 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={() => order.status === "completed" ? navigate("/reports") : navigate(`/tracking/${order.id}`)} className="soft-card border border-white/50 bg-white/60 backdrop-blur-md p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10 text-primary"><TestTube className="w-7 h-7" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-foreground text-sm truncate">{order.test_name || "Lab Test"}</h3>
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg uppercase tracking-tighter">{order.status || "pending"}</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">{order.lab_name || "Diagnostic Lab"}</p>
                  <p className="text-[11px] font-black text-primary/80 mt-2">{format(new Date(order.created_at), "dd MMM yyyy • hh:mm a")}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/40">
                <div><p className="text-[10px] font-bold text-muted-foreground/50 uppercase mb-0.5">Total Paid</p><p className="text-[18px] font-black text-foreground">₹{order.total}</p></div>
                <button onClick={(e) => { e.stopPropagation(); addToCart({ id: `reorder-${order.id}`, name: order.test_name || "Test", price: order.total }); }} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-border rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-all text-primary"><RotateCw className="w-3.5 h-3.5" /> Reorder</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
};

export default BookingsScreen;
