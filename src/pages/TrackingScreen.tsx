import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  Truck,
  FileText,
  Home,
  Phone,
  MessageCircle,
  Navigation,
  Download,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { format } from "date-fns";

interface OrderData {
  id: string;
  order_number: string | null;
  status: string | null;
  scheduled_date: string | null;
  scheduled_time_slot: string | null;
  total: number;
  created_at: string;
  test_name: string | null;
  lab_name: string | null;
  payment_status: string | null;
  report_url: string | null;
  delivery_partner_name: string | null;
}

interface CollectionPartnerInfo {
  name: string;
}

const workflowSteps = [
  { key: "confirmed", label: "Booking Confirmed" },
  { key: "assigned", label: "Phlebotomist Assigned" },
  { key: "in_progress", label: "Sample Collected" },
  { key: "completed", label: "Report Arrived" },
];

function getCompletedIndex(status: string | null): number {
  switch (status) {
    case "pending":
    case "confirmed":
    case "accepted":
      return 0;
    case "assigned":
    case "out_for_collection":
      return 1;
    case "in_progress":
    case "sample_collected":
    case "collection_complete":
    case "sample_received":
    case "processing":
      return 2;
    case "lab_processing":
    case "report_ready":
    case "report_delivered":
    case "completed":
      return 3;
    default:
      return -1;
  }
}

const TrackingScreen = () => {
  const navigate = useNavigate();
  const { orderId: paramOrderId } = useParams();
  const { supabaseUserId } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [phlebotomist, setPhlebotomist] = useState<PhlebotomistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { latestStatus } = useRealtimeOrders(paramOrderId || undefined);

  // Update order status in real-time and re-fetch for report_url
  useEffect(() => {
    if (latestStatus && order) {
      setOrder((prev) => (prev ? { ...prev, status: latestStatus } : prev));
      // Re-fetch order to get report_url when status changes to report_ready/completed
      if (["report_ready", "report_delivered", "completed"].includes(latestStatus) && paramOrderId) {
        supabase
          .from("orders")
          .select("*")
          .eq("id", paramOrderId)
          .single()
          .then(({ data }) => {
            if (data) setOrder(data as OrderData);
          });
      }
    }
  }, [latestStatus]);

  useEffect(() => {
    if (!paramOrderId) {
      setError("No order ID provided");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", paramOrderId)
          .single();

        if (fetchErr || !data) {
          setError("Order not found");
          return;
        }

        setOrder(data as OrderData);

        // Fetch phlebotomist if assigned
        if (data.phlebotomist_id) {
          const { data: phlebo } = await supabase
            .from("phlebotomists_public")
            .select("name, photo_url, rating, experience_years")
            .eq("id", data.phlebotomist_id)
            .single();
          if (phlebo?.name) setPhlebotomist(phlebo as PhlebotomistInfo);
        }
      } catch {
        setError("Failed to fetch order");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [paramOrderId]);

  if (loading) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Order Details" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !order) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Order Details" />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">{error || "Order not found"}</h2>
          <Button variant="soft" onClick={() => navigate("/bookings")} className="mt-4">
            Back to My Orders
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const completedIndex = getCompletedIndex(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Order Details" />

      <div className="px-4 pb-8">
        {/* Order info card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="soft-card mt-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-foreground">{order.test_name || "Lab Test"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {order.order_number || `#${order.id.slice(0, 8)}`}
              </p>
            </div>
            <Badge className={isCancelled ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}>
              {isCancelled ? "Cancelled" : workflowSteps[Math.min(completedIndex, 3)]?.label || "Processing"}
            </Badge>
          </div>

          {order.lab_name && (
            <p className="text-sm text-muted-foreground mb-2">Lab: {order.lab_name}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {order.scheduled_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(order.scheduled_date), "MMM dd, yyyy")}
              </span>
            )}
            {order.scheduled_time_slot && (
              <span>{order.scheduled_time_slot}</span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-bold text-foreground text-lg">₹{order.total}</span>
          </div>
        </motion.div>

        {/* Phlebotomist card */}
        {phlebotomist && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="soft-card mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                {phlebotomist.photo_url ? (
                  <img src={phlebotomist.photo_url} alt={phlebotomist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Phlebotomist</p>
                <p className="font-semibold text-foreground">{phlebotomist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {phlebotomist.experience_years ? `${phlebotomist.experience_years}+ yrs exp` : "Experienced"} • ⭐ {phlebotomist.rating || "5.0"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="soft" size="icon" className="h-9 w-9 rounded-xl">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Workflow Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="soft-card mt-4"
        >
          <h3 className="font-bold text-lg text-foreground mb-6">Tracking Status</h3>

          {isCancelled ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mb-3">
                <Clock className="w-7 h-7 text-destructive" />
              </div>
              <p className="font-medium text-destructive">This order was cancelled</p>
            </div>
          ) : (
            <div className="relative pl-1">
              {workflowSteps.map((step, index) => {
                const isCompleted = index <= completedIndex;
                const isLast = index === workflowSteps.length - 1;

                return (
                  <div key={step.key} className="flex items-start gap-4 relative">
                    {/* Vertical line */}
                    {!isLast && (
                      <div
                        className={`absolute left-[18px] top-10 w-0.5 h-[calc(100%-10px)] ${
                          index < completedIndex ? "bg-success" : "bg-muted-foreground/20"
                        }`}
                      />
                    )}

                    {/* Circle */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15 + index * 0.1, type: "spring", stiffness: 200 }}
                      className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-success text-white"
                          : "bg-muted-foreground/30"
                      }`}
                    >
                      {isCompleted && <CheckCircle className="w-5 h-5" />}
                    </motion.div>

                    {/* Label + timestamp */}
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className={`flex-1 ${isLast ? "pb-0" : "pb-8"}`}
                    >
                      <p className={`font-bold text-base ${
                        isCompleted ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </p>
                      {isCompleted && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {order.created_at
                            ? format(new Date(order.created_at), "hh:mm a")
                            : "—"}
                        </p>
                      )}

                      {step.key === "completed" && isCompleted && order.report_url && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="soft"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(order.report_url!, "_blank");
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View Report
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement("a");
                              link.href = order.report_url!;
                              link.download = `report-${order.order_number || order.id.slice(0, 8)}.pdf`;
                              link.target = "_blank";
                              link.click();
                            }}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Download
                          </Button>
                        </div>
                      )}
                      {step.key === "completed" && isCompleted && !order.report_url && (
                        <Button
                          variant="soft"
                          size="sm"
                          className="mt-2 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/reports");
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          View Reports
                        </Button>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 space-y-3"
        >
          <Button
            className="w-full h-12 rounded-2xl gap-2"
            onClick={() => navigate("/home")}
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/support")}
          >
            Need Help? Contact Support
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default TrackingScreen;
