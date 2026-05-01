import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  FileText,
  Home,
  Navigation,
  Download,
  Eye,
  Phone,
  FlaskConical,
  Building2,
  IndianRupee,
  Calendar,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { format } from "date-fns";
import CancelOrderDialog from "@/components/orders/CancelOrderDialog";

interface OrderData {
  id: string;
  order_number: string | null;
  status: string | null;
  scheduled_date: string | null;
  scheduled_time_slot: string | null;
  total: number;
  subtotal: number;
  discount: number | null;
  created_at: string;
  test_name: string | null;
  lab_name: string | null;
  payment_status: string | null;
  report_url: string | null;
  delivery_partner_name: string | null;
  delivery_partner_phone: string | null;
}

interface OrderItem {
  id: string;
  test_id: string | null;
  package_id: string | null;
  price: number;
  quantity: number | null;
}

const workflowSteps = [
  { key: "confirmed", label: "Booking Confirmed", icon: CheckCircle },
  { key: "assigned", label: "Collection Partner Assigned", icon: User },
  { key: "in_progress", label: "Sample Collected", icon: FlaskConical },
  { key: "completed", label: "Report Arrived", icon: FileText },
];

function getCompletedIndex(status: string | null): number {
  switch (status) {
    case "pending":
    case "confirmed":
    case "accepted":
      return 0;
    case "processing":
    case "assigned":
    case "out_for_collection":
      return 1;
    case "sample_collected":
    case "in_progress":
    case "collection_complete":
    case "sample_received":
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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [testNames, setTestNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { latestStatus } = useRealtimeOrders(paramOrderId || undefined);

  // Update order status in real-time
  useEffect(() => {
    if (latestStatus && order) {
      setOrder((prev) => (prev ? { ...prev, status: latestStatus } : prev));
      if (paramOrderId) {
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
        // Fetch order and order items in parallel
        const [orderRes, itemsRes] = await Promise.all([
          supabase.from("orders").select("*").eq("id", paramOrderId).single(),
          supabase.from("order_items").select("*").eq("order_id", paramOrderId),
        ]);

        if (orderRes.error || !orderRes.data) {
          setError("Order not found");
          return;
        }

        setOrder(orderRes.data as OrderData);

        if (itemsRes.data && itemsRes.data.length > 0) {
          setOrderItems(itemsRes.data as OrderItem[]);
          
          // Fetch test names for each item
          const testIds = itemsRes.data
            .filter((i: any) => i.test_id)
            .map((i: any) => i.test_id);
          const packageIds = itemsRes.data
            .filter((i: any) => i.package_id)
            .map((i: any) => i.package_id);

          const names: string[] = [];

          if (testIds.length > 0) {
            const { data: tests } = await supabase
              .from("tests")
              .select("id, name")
              .in("id", testIds);
            if (tests) tests.forEach((t) => names.push(t.name));
          }

          if (packageIds.length > 0) {
            const { data: packages } = await supabase
              .from("test_packages")
              .select("id, name")
              .in("id", packageIds);
            if (packages) packages.forEach((p) => names.push(p.name));
          }

          // If no names resolved from DB, fall back to order.test_name
          if (names.length === 0 && orderRes.data.test_name) {
            // Split comma-separated test names
            names.push(...orderRes.data.test_name.split(",").map((n: string) => n.trim()).filter(Boolean));
          }

          setTestNames(names);
        } else if (orderRes.data.test_name) {
          setTestNames(orderRes.data.test_name.split(",").map((n: string) => n.trim()).filter(Boolean));
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
        {/* Order Number & Status Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-muted-foreground">Order</p>
            <p className="font-bold text-foreground">{order.order_number || `#${order.id.slice(0, 8)}`}</p>
          </div>
          <Badge className={isCancelled ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}>
            {isCancelled ? "Cancelled" : workflowSteps[Math.min(completedIndex, 3)]?.label || "Processing"}
          </Badge>
        </motion.div>

        {/* Tile 1: Test Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="soft-card mt-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Test Summary</h3>
            <Badge variant="soft" className="ml-auto text-xs">
              {testNames.length || orderItems.length || 1} {(testNames.length || orderItems.length || 1) === 1 ? "Test" : "Tests"}
            </Badge>
          </div>

          {/* Test names list */}
          <div className="space-y-1.5 mb-4">
            {testNames.length > 0 ? (
              testNames.map((name, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </span>
                  <p className="text-sm text-foreground">{name}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{order.test_name || "Lab Test"}</p>
            )}
          </div>

          {/* Lab Name */}
          {order.lab_name && (
            <div className="flex items-center gap-2 py-2.5 border-t border-border">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Lab:</span>
              <span className="text-sm font-semibold text-foreground">{order.lab_name}</span>
            </div>
          )}

          {/* Schedule */}
          {(order.scheduled_date || order.scheduled_time_slot) && (
            <div className="flex items-center gap-2 py-2.5 border-t border-border">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {order.scheduled_date && format(new Date(order.scheduled_date), "MMM dd, yyyy")}
                {order.scheduled_time_slot && ` • ${order.scheduled_time_slot}`}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Amount</span>
            </div>
            <span className="text-lg font-bold text-foreground">₹{order.total}</span>
          </div>
        </motion.div>

        {/* Tile 2: Collection Partner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="soft-card mt-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Collection Partner</h3>
          </div>

          {order.delivery_partner_name ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{order.delivery_partner_name}</p>
                {order.delivery_partner_phone && (
                  <a
                    href={`tel:${order.delivery_partner_phone}`}
                    className="flex items-center gap-1 text-sm text-primary mt-0.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {order.delivery_partner_phone}
                  </a>
                )}
              </div>
              {order.delivery_partner_phone && (
                <a
                  href={`tel:${order.delivery_partner_phone}`}
                  className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0"
                >
                  <Phone className="w-5 h-5 text-success" />
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Not yet assigned</p>
                <p className="text-xs text-muted-foreground mt-0.5">The lab will assign a collection partner soon</p>
              </div>
            </div>
          )}

          {/* Tracking Status Timeline */}
          <div className="mt-5 pt-4 border-t border-border">
            <h4 className="font-semibold text-foreground mb-4">Tracking Status</h4>

            {isCancelled ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center mb-2">
                  <Clock className="w-6 h-6 text-destructive" />
                </div>
                <p className="font-medium text-destructive text-sm">This order was cancelled</p>
              </div>
            ) : (
              <div className="relative pl-1">
                {workflowSteps.map((step, index) => {
                  const isCompleted = index <= completedIndex;
                  const isCurrent = index === completedIndex;
                  const isLast = index === workflowSteps.length - 1;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="flex items-start gap-3 relative">
                      {/* Vertical connector */}
                      {!isLast && (
                        <div
                          className={`absolute left-[15px] top-9 w-0.5 h-[calc(100%-12px)] ${
                            index < completedIndex ? "bg-success" : "bg-border"
                          }`}
                        />
                      )}

                      {/* Circle */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 + index * 0.08, type: "spring", stiffness: 200 }}
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? "bg-success text-white"
                            : isCurrent
                            ? "bg-primary/20 ring-2 ring-primary"
                            : "bg-muted"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                      </motion.div>

                      {/* Label */}
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + index * 0.08 }}
                        className={`flex-1 ${isLast ? "pb-0" : "pb-6"}`}
                      >
                        <p className={`font-semibold text-sm ${
                          isCompleted ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </p>
                        {isCompleted && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {order.created_at
                              ? format(new Date(order.created_at), "hh:mm a, MMM dd")
                              : "—"}
                          </p>
                        )}

                        {/* Report actions */}
                        {step.key === "completed" && isCompleted && order.report_url && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="soft"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => window.open(order.report_url!, "_blank")}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View Report
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
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
                            onClick={() => navigate("/reports")}
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
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 space-y-3"
        >
          {!isCancelled && completedIndex < 1 && (
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="w-5 h-5" />
              Cancel or Reschedule Order
            </Button>
          )}
          {!isCancelled && completedIndex >= 1 && completedIndex < 3 && (
            <p className="text-xs text-muted-foreground text-center px-4">
              Cancellation is unavailable — a collection partner has been assigned to your order.
            </p>
          )}
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

      {order && supabaseUserId && (
        <CancelOrderDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          orderId={order.id}
          orderTotal={order.total}
          userId={supabaseUserId}
          orderStatus={order.status}
          onSuccess={(mode) => {
            // refresh the order
            supabase.from("orders").select("*").eq("id", order.id).single().then(({ data }) => {
              if (data) setOrder(data as OrderData);
            });
            if (mode === "cancelled") {
              setTimeout(() => navigate("/bookings"), 800);
            }
          }}
        />
      )}
    </MobileLayout>
  );
};

export default TrackingScreen;
