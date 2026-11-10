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
  const [serviceTab, setServiceTab] = useState<"blood" | "vitals">("blood");

  useRealtimeOrders();

  const serviceCounts = useMemo(() => {
    return orders.reduce(
      (acc, o) => {
        acc[getServiceKind(o)] += 1;
        return acc;
      },
      { blood: 0, vitals: 0 } as Record<"blood" | "vitals", number>,
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => getServiceKind(o) === serviceTab);

    if (serviceTab === "blood" && activeFilter !== "all") {
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
  }, [orders, activeFilter, debouncedSearchQuery, serviceTab]);


  const getDisplayStatus = (status: string | null) => {
    switch (status) {
      case "completed":
      case "report_ready":
      case "report_delivered":
        return { label: "Report ready", tone: "bg-success/15 text-success" };
      case "in_progress":
      case "sample_collected":
        return { label: "Sample collected", tone: "bg-primary/10 text-primary" };
      case "assigned":
      case "partner_assigned":
      case "out_for_collection":
      case "processing":
        return { label: "Partner assigned", tone: "bg-primary/10 text-primary" };
      case "lab_processing":
        return { label: "Lab processing", tone: "bg-primary/10 text-primary" };
      case "accepted":
        return { label: "Accepted", tone: "bg-primary/10 text-primary" };
      case "confirmed":
        return { label: "Confirmed", tone: "bg-primary/10 text-primary" };
      case "collection_pending":
        return { label: "Collection pending", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
      case "pending":
        return { label: "Pending", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
      case "cancelled":
        return { label: "Cancelled", tone: "bg-destructive/10 text-destructive" };
      default:
        return { label: status ? status.replace(/_/g, ' ') : "Order placed", tone: "bg-muted text-muted-foreground" };
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
    const ECG_RE = /ecg|electrocardiogram/i;
    const vitalsParts = splitTestNames(order.test_name);
    // A pure BP or ECG booking gets vitals-style card; a BP/ECG add-on on a lab order stays a lab order.
    const isVitals = vitalsParts.length > 0
      ? vitalsParts.every((p) => BP_RE.test(p) || ECG_RE.test(p))
      : BP_RE.test(order.order_number || "") || ECG_RE.test(order.order_number || "") || ECG_RE.test(order.test_name || "");
    const isEcg = ECG_RE.test(order.test_name || "") || ECG_RE.test(order.order_number || "");

    const BookingIcon = getBookingIcon(order.order_number);
    const bookingType = getBookingType(order.order_number);
    const statusInfo = getDisplayStatus(order.status);
    const showTimeline = isVitals ? (order.status !== "cancelled") : !["completed", "report_ready", "report_delivered", "cancelled"].includes(order.status || "");
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

    const isDone = ["completed", "report_ready", "report_delivered"].includes(order.status || "");
    const isRescheduled = Number(order.reschedule_count) > 0 && order.status !== "cancelled";

    return (
      // CSS-only entrance (compositor driven). The previous spring + `layout`
      // animation re-measured every card on each render, which is the main
      // source of jank while scrolling a long order list.
      <div
        key={order.id}
        style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
        className="animate-fade-in press-row"
        onClick={() => handleOrderClick(order)}
      >
        <div className={`border rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-transform duration-150 ${
          isVitals ? "bg-blue-500/[0.04] border-blue-500/30" : "bg-card border-border/60"
        }`}>
          {/* Top: what was booked, for whom, and where it stands */}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isVitals ? "bg-blue-600 text-white" : "bg-primary/10 text-primary"
            }`}>
              {isVitals ? <Heart className="w-5 h-5" /> : <BookingIcon className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              {isVitals && (
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                  {isEcg ? "At-home ECG" : "Home BP check"}
                </p>
              )}
              <h3 className="font-bold text-foreground text-[15px] leading-snug line-clamp-2">
                {formatTestsLabel(order.test_name, bookingType)}
              </h3>
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                <User className="w-3 h-3 shrink-0" /> {patientName}
              </p>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${statusInfo.tone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusInfo.label}
            </span>
          </div>

          {/* Lab & schedule */}
          <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5 grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground">Lab</p>
              <p className="text-xs font-bold text-foreground truncate">{order.lab_name || "BloodLyn Direct"}</p>
            </div>
            <div className="min-w-0 text-right">
              {/* A visit the patient moved says so in the label itself, not in an extra line. */}
              {isRescheduled ? (
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Rescheduled</p>
              ) : (
                <p className="text-[10px] font-semibold text-muted-foreground">Scheduled</p>
              )}
              <p className="text-xs font-bold text-foreground">
                {order.scheduled_date ? format(new Date(order.scheduled_date), "dd MMM yyyy") : "ASAP"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{order.scheduled_time_slot || "60 min express"}</p>
            </div>
          </div>

          {/* Progress */}
          {showTimeline && (
            <div className="mt-4 mb-9">
              <OrderStatusTimeline status={order.status} isBp={isVitals} />
            </div>
          )}

          {/* Bottom: total & action */}
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">Total</p>
              <p className="text-base font-black text-foreground tabular-nums">₹{order.total}</p>
            </div>

            <div className="flex items-center gap-2">
              {order.order_number?.startsWith("DOC") && !["completed", "cancelled"].includes(order.status || "") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/call/${order.id}?mode=video`);
                  }}
                  className="flex items-center gap-1.5 bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-600"
                >
                  <Video className="w-3.5 h-3.5" />
                  Join now
                </button>
              )}
              <button className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                isDone && !isVitals
                  ? "bg-primary text-primary-foreground"
                  : isVitals
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-primary/10 text-primary"
              }`}>
                {order.status === "completed" ? (isVitals ? "View status" : "View report") : "Track order"}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
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
          <div className="w-full space-y-2">
            {/* Service type segmented control */}
            <div className="flex w-full gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border/50">
              {SERVICE_TABS.map((t) => {
                const Icon = t.icon;
                const active = serviceTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setServiceTab(t.key)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                    <span className={`text-[10px] font-bold px-1.5 rounded-full ${active ? "bg-primary/10 text-primary" : "bg-border/60 text-muted-foreground"}`}>
                      {serviceCounts[t.key]}
                    </span>
                  </button>
                );
              })}
            </div>
            {serviceTab === "blood" && (
              <div className="flex w-full p-1 rounded-full bg-muted/60 border border-border/50">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`flex-1 py-2 px-2 rounded-full text-[12px] font-semibold transition-all duration-300 flex items-center justify-center text-center shrink-0 ${
                      activeFilter === f.key
                        ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
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
              initial={false}
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
              initial={false}
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
                className="bg-primary text-primary-foreground px-8 py-3.5 rounded-2xl text-[15px] font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform"
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
