import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Circle,
  Clock,
  TestTube,
  Truck,
  FlaskConical,
  FileText,
  Home,
  Phone,
  MessageCircle,
  Navigation,
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
}

interface PhlebotomistInfo {
  name: string;
  photo_url: string | null;
  rating: number | null;
  experience_years: number | null;
}

const workflowSteps = [
  { key: "confirmed", label: "Order Confirmed", icon: CheckCircle, description: "Your order has been confirmed" },
  { key: "assigned", label: "Phlebotomist Assigned", icon: Truck, description: "A phlebotomist has been assigned" },
  { key: "in_progress", label: "Sample Collected", icon: TestTube, description: "Your sample has been collected" },
  { key: "lab_processing", label: "Sent to Lab", icon: FlaskConical, description: "Sample is being processed at the lab" },
  { key: "completed", label: "Report Arrived", icon: FileText, description: "Your report is ready to view" },
];

function getCompletedIndex(status: string | null): number {
  switch (status) {
    case "pending":
    case "confirmed":
      return 0;
    case "assigned":
      return 1;
    case "in_progress":
      return 2;
    case "lab_processing":
      return 3;
    case "completed":
      return 4;
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

  // Update order status in real-time
  useEffect(() => {
    if (latestStatus && order) {
      setOrder((prev) => (prev ? { ...prev, status: latestStatus } : prev));
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
              {isCancelled ? "Cancelled" : workflowSteps[Math.min(completedIndex, 4)]?.label || "Processing"}
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
          <h3 className="font-semibold text-foreground mb-5">Order Progress</h3>

          {isCancelled ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mb-3">
                <Clock className="w-7 h-7 text-destructive" />
              </div>
              <p className="font-medium text-destructive">This order was cancelled</p>
            </div>
          ) : (
            <div className="relative">
              {workflowSteps.map((step, index) => {
                const isCompleted = index <= completedIndex;
                const isCurrent = index === completedIndex;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex gap-4 relative">
                    {/* Vertical connector line */}
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 200 }}
                        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                          isCompleted
                            ? "bg-success text-white shadow-md"
                            : "bg-muted text-muted-foreground"
                        } ${isCurrent ? "ring-4 ring-success/20" : ""}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}

                        {/* Pulse on current step */}
                        {isCurrent && (
                          <motion.div
                            className="absolute inset-0 rounded-full bg-success/30"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </motion.div>

                      {/* Connector line */}
                      {index < workflowSteps.length - 1 && (
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className={`w-0.5 h-12 origin-top ${
                            index < completedIndex ? "bg-success" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + index * 0.1 }}
                      className={`flex-1 pb-6 ${index === workflowSteps.length - 1 ? "pb-0" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${
                          isCompleted ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <Badge variant="soft" className="text-[10px] py-0 px-2 bg-success/10 text-success">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        isCompleted ? "text-muted-foreground" : "text-muted-foreground/60"
                      }`}>
                        {step.description}
                      </p>

                      {/* View Report button for completed */}
                      {step.key === "completed" && isCompleted && (
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
                          View Report
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
