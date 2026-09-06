import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
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
  Filter,
  ArrowRight,
  User,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import StickySearch from "@/components/ui/StickySearch";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { format } from "date-fns";
import { useSEO } from "@/hooks/useSEO";
import { formatTestsLabel, splitTestNames } from "@/lib/format-tests";
import OrderStatusTimeline from "@/components/orders/OrderStatusTimeline";
import { useOrders, Order } from "@/hooks/useOrders";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

const SERVICE_TABS = [
  { key: "blood", label: "Blood Tests", icon: TestTube },
  { key: "vitals", label: "ECG & BP", icon: Activity },
] as const;

const BP_PATTERN = /(?:home\s*bp|bp\s*check|blood\s*pressure)/i;
const ECG_PATTERN = /ecg|electrocardiogram/i;

/** Classify an order as a blood-test booking or an ECG / BP vitals booking. */
const getServiceKind = (order: Order): "blood" | "vitals" => {
  const parts = splitTestNames(order.test_name);
  const label = `${order.order_number || ""} ${order.test_name || ""}`;
  const isVitals =
    parts.length > 0
      ? parts.every((p) => BP_PATTERN.test(p) || ECG_PATTERN.test(p))
      : BP_PATTERN.test(label) || ECG_PATTERN.test(label);
  return isVitals ? "vitals" : "blood";
};


const BookingsScreen = () => {
  useSEO({ title: "My Orders | BloodLyn", description: "Track your diagnostic test orders, sample collection status and view past bookings." });
  const navigate = useNavigate();
  const { data: orders = [], isLoading: loading } = useOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useRealtimeOrders();

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeFilter !== "all") {
      if (activeFilter === "confirmed") {
        result = result.filter((o) => [
          "confirmed", "pending", "accepted", "assigned", "partner_assigned", "out_for_collection",
          "collection_pending", "in_progress", "sample_collected", "processing", "lab_processing"
        ].includes(o.status || ""));
      } else if (activeFilter === "completed") {
        result = result.filter((o) => ["completed", "report_ready", "report_delivered"].includes(o.status || ""));
      } else {
        result = result.filter((o) => o.status === activeFilter);
      }
    }

    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.test_name?.toLowerCase().includes(q) ||
          o.order_number?.toLowerCase().includes(q) ||
          o.lab_name?.toLowerCase().includes(q) ||
          (o.patient_name || o.family_members?.full_name || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, activeFilter, debouncedSearchQuery]);

  const getDisplayStatus = (status: string | null) => {
    switch (status) {
      case "completed":
      case "report_ready":
      case "report_delivered":
        return { label: "Ready", color: "bg-success text-success-foreground", pulse: false };
      case "in_progress":
      case "sample_collected":
        return { label: "Sample Collected", color: "bg-primary text-primary-foreground", pulse: true };
      case "assigned":
      case "partner_assigned":
      case "out_for_collection":
      case "processing":
        return { label: "Partner Assigned", color: "bg-secondary text-secondary-foreground", pulse: true };
      case "lab_processing":
        return { label: "Lab Processing", color: "bg-secondary text-secondary-foreground", pulse: true };
      case "accepted":
        return { label: "Accepted", color: "bg-primary/80 text-primary-foreground", pulse: false };
      case "confirmed":
        return { label: "Confirmed", color: "bg-primary text-primary-foreground", pulse: false };
      case "collection_pending":
        return { label: "Collection Pending", color: "bg-warning text-warning-foreground", pulse: true };
      case "pending":
        return { label: "Pending", color: "bg-warning text-warning-foreground", pulse: true };
      case "cancelled":
        return { label: "Cancelled", color: "bg-destructive text-destructive-foreground", pulse: false };
      default:
        return { label: status ? status.replace(/_/g, ' ') : "Order Placed", color: "bg-muted text-muted-foreground", pulse: false };
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
    const BP_RE = /(?:home\s*bp|bp\s*check|blood\s*pressure)/i;
    const bpParts = splitTestNames(order.test_name);
    // Only a pure BP booking counts as a BP order; a BP add-on on a lab order stays a lab order.
    const isBp = bpParts.length > 0
      ? bpParts.every((p) => BP_RE.test(p))
      : BP_RE.test(order.order_number || "");

    const BookingIcon = getBookingIcon(order.order_number);
    const bookingType = getBookingType(order.order_number);
    const statusInfo = getDisplayStatus(order.status);
    const showTimeline = isBp ? (order.status !== "cancelled") : !["completed", "report_ready", "report_delivered", "cancelled"].includes(order.status || "");
    let patientName = order.patient_name || (order as any).family_members?.full_name;
    if (!patientName && (order as any).special_instructions) {
      const match = (order as any).special_instructions.match(/Patient:\s*([^(|]+)/);
      if (match && match[1]) {
        patientName = match[1].trim();
      }
    }
    if (!patientName) {
      patientName = "Self";
    }

    return (
      // CSS-only entrance (compositor driven). The previous spring + `layout`
      // animation re-measured every card on each render, which is the main
      // source of jank while scrolling a long order list.
      <div
        key={order.id}
        style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
        className="relative group animate-fade-in press-row"
        onClick={() => handleOrderClick(order)}
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2rem] blur opacity-0 group-active:opacity-100 transition duration-500" />

        <div className={`relative border rounded-[2rem] p-5 shadow-sm active:scale-[0.98] transition-all duration-200 overflow-hidden ${
          isBp 
            ? "bg-gradient-to-br from-blue-500/[0.08] via-indigo-500/[0.04] to-card border-blue-500/40 shadow-blue-500/5" 
            : "bg-card border-border/50"
        }`}>
          {/* Top Row: Icon & Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                isBp 
                  ? "bg-gradient-to-tr from-blue-600 to-indigo-600 border-blue-500/30 text-white shadow-lg shadow-blue-500/20" 
                  : "bg-primary/5 border-primary/10 text-primary"
              }`}>
                {isBp ? <Heart className="w-5 h-5 fill-white/20 animate-pulse" /> : <BookingIcon className="w-5 h-5" />}
              </div>
              <div>
                {isBp && (
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase px-2 py-0.5 mb-1 inline-flex items-center gap-1">
                    🫀 Home BP Check
                  </Badge>
                )}
                <h3 className="font-bold text-foreground text-[15px] leading-tight">
                  {formatTestsLabel(order.test_name, bookingType)}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                    <User className="w-3 h-3 text-muted-foreground/60" />
                    <p className="text-[10px] font-bold text-muted-foreground/80 tracking-wide uppercase">
                      Patient: {patientName}
                    </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wide shadow-sm ${statusInfo.color}`}>
                <span className="flex items-center gap-1.5">
                  {statusInfo.pulse && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                    </span>
                  )}
                  {statusInfo.label}
                </span>
              </Badge>
            </div>
          </div>

          {/* Middle Section: Lab & Schedule */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/40">
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Diagnostic Center</p>
              <p className="text-xs font-bold text-foreground/80 truncate">
                {order.lab_name || "BloodLyn Direct"}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Scheduled For</p>
              <div className="flex flex-col items-end">
                <p className="text-xs font-bold text-foreground/80">
                  {order.scheduled_date ? format(new Date(order.scheduled_date), "dd MMM, yyyy") : "ASAP"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium italic">
                  {order.scheduled_time_slot || "60 min express"}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Timeline */}
          {showTimeline && (
            <div className="mt-5 mb-8">
              <OrderStatusTimeline status={order.status} isBp={isBp} />
            </div>
          )}

          {/* Bottom Row: Total & Action */}
          <div className="flex items-center justify-between mt-5 pt-1">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Total Amount</span>
              <span className="text-lg font-black text-foreground">₹{order.total}</span>
            </div>

            <div className="flex items-center gap-2">
              {order.order_number?.startsWith("DOC") && !["completed", "cancelled"].includes(order.status || "") && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/call/${order.id}?mode=video`);
                  }}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-colors hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                >
                  <Video className="w-3.5 h-3.5" />
                  JOIN NOW
                </button>
              )}
              <button className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-colors ${
                isBp
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
              }`}>
                {order.status === "completed" ? (isBp ? "VIEW STATUS" : "VIEW REPORT") : "TRACK STATUS"}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MobileLayout>
      {/* Page Header - Scrolls away naturally like Home screen */}
      <div className="px-5 pt-3 pb-1">
        <PremiumPageHeader
          title="My Orders"
          subtitle="Track bookings · live status updates"
          icon={Package}
          badgeText="Orders"
        />
      </div>

      {/* Sticky Search Bar & Filter Tabs - Pins at top-0 */}
      <StickySearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search tests, orders, labs..."
        accent="from-emerald-500 via-teal-500 to-primary"
        footer={
          <div className="flex w-full gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all duration-300 shadow-sm flex items-center justify-center text-center shrink-0 ${
                  activeFilter === f.key
                    ? "bg-primary text-primary-foreground scale-[1.02]"
                    : "bg-card border border-border/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-5 pb-24 pt-4">
        {/* Orders List */}
        <div className="space-y-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border/50 rounded-[2rem] p-5 h-48 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-muted" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-4 pt-4 border-t border-muted/30">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-3 list-virtual-lg">
              {filteredOrders.map((order, idx) => renderOrderCard(order, idx))}
            </div>
          ) : orders.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-muted/30 flex items-center justify-center mb-6">
                <Filter className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-black text-foreground mb-2">No Results Found</h3>
              <p className="text-sm text-muted-foreground max-w-[220px] font-medium leading-relaxed">
                We couldn't find any orders matching your current filter.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-24 h-24 rounded-[2.5rem] bg-primary/5 flex items-center justify-center mb-8 border border-primary/10 shadow-inner">
                <Package className="w-10 h-10 text-primary/30" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-3 tracking-tight">Your Health Journey Starts Here</h3>
              <p className="text-[13px] text-muted-foreground max-w-[260px] font-medium leading-relaxed mb-8">
                You haven't booked any tests yet. Take the first step towards wellness today!
              </p>
              <button
                onClick={() => navigate("/home")}
                className="bg-primary text-primary-foreground px-8 py-3.5 rounded-[1.5rem] text-[13px] font-black tracking-wider uppercase shadow-xl shadow-primary/20 active:scale-95 transition-transform"
              >
                Book Your First Test
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default BookingsScreen;
