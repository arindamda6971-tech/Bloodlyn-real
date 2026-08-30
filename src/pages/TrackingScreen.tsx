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
  UserCheck,
  XCircle,
  CreditCard,
  Video,
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
import CollectionConfirmPrompt from "@/components/orders/CollectionConfirmPrompt";

import { useOrderDetails, OrderData, OrderItem } from "@/hooks/useOrderDetails";
import { useQueryClient } from "@tanstack/react-query";

const workflowSteps = [
  { key: "accepted", label: "Order Accepted", icon: CheckCircle },
  { key: "collection", label: "Sample Collection", icon: FlaskConical },
  { key: "report", label: "Reports Ready", icon: FileText },
];

const REPORT_STATUSES = ["report_ready", "report_delivered", "completed"];
const COLLECTED_STATUSES = [
  "sample_collected",
  "in_progress",
  "collection_complete",
  "sample_received",
  "lab_processing",
];
// `processing` is the legacy value currently emitted by the Partner app when
// it assigns a collection partner. It must not advance collection completion.
const ASSIGNED_STATUSES = ["assigned", "partner_assigned", "out_for_collection", "processing"];

/** Lab has explicitly accepted the order in the Partner dashboard. */
function isLabAccepted(status: string | null, partnerName?: string | null): boolean {
  const s = status?.toLowerCase() || "";
  if (["accepted", "collection_pending", ...ASSIGNED_STATUSES, ...COLLECTED_STATUSES, ...REPORT_STATUSES].includes(s)) {
    return true;
  }
  // Legacy orders: a partner was assigned, so the lab clearly accepted it.
  return !!partnerName && s !== "pending" && s !== "confirmed" ? true : false;
}

function getCompletedIndex(status: string | null, partnerName?: string | null): number {
  const s = status?.toLowerCase() || "";
  if (REPORT_STATUSES.includes(s)) return 2;
  if (COLLECTED_STATUSES.includes(s)) return 1;
  if (isLabAccepted(status, partnerName)) return 0;
  return -1;
}


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

const TrackingScreen = () => {
  const navigate = useNavigate();
  const { orderId: paramOrderId } = useParams();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const { supabaseUserId } = useAuth();

  const { data, isLoading: loading, error } = useOrderDetails(paramOrderId);
  const order = data?.order;
  const orderItems = data?.items || [];
  const testNames = data?.testNames || [];

  const { latestStatus } = useRealtimeOrders(paramOrderId || undefined);



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
          <h2 className="text-lg font-semibold text-foreground mb-2">{error instanceof Error ? error.message : "Order not found"}</h2>
          <Button variant="soft" onClick={() => navigate("/bookings")} className="mt-4">
            Back to My Orders
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const isBpOrder = /(?:home\s*bp|bp\s*check|blood\s*pressure)/i.test(order.test_name || "") || /(?:home\s*bp|bp\s*check|blood\s*pressure)/i.test(order.order_number || "") || /(?:home\s*bp|bp\s*check|blood\s*pressure)/i.test(testNames.join(" ") || "");

  const activeWorkflowSteps = isBpOrder ? [
    { key: "confirmed", label: "Ordered", icon: CheckCircle },
    { key: "completed", label: "Checked", icon: CheckCircle },
  ] : workflowSteps;

  const completedIndex = isBpOrder
    ? (["completed", "report_ready", "report_delivered", "checked"].includes(order.status?.toLowerCase() || "") ? 1 : 0)
    : getCompletedIndex(order.status, order.delivery_partner_name);
  const isCancelled = order.status === "cancelled";
  const statusInfo = getDisplayStatus(order.status);

  const statusLower = order.status?.toLowerCase() || "";
  const labAccepted = !isBpOrder && isLabAccepted(order.status, order.delivery_partner_name);
  const partnerAssigned =
    !isBpOrder && (ASSIGNED_STATUSES.includes(statusLower) || !!order.delivery_partner_name);
  const collectionDone =
    !isBpOrder && (COLLECTED_STATUSES.includes(statusLower) || REPORT_STATUSES.includes(statusLower));
  const showCollectionPrompt =
    !isCancelled &&
    statusLower !== "collection_pending" &&
    labAccepted &&
    partnerAssigned &&
    !collectionDone;


  let patientName = order.patient_name || order.family_members?.full_name;
  if (!patientName && order.special_instructions) {
    const match = order.special_instructions.match(/Patient:\s*([^(|]+)/);
    if (match && match[1]) {
      patientName = match[1].trim();
    }
  }
  if (!patientName) {
    patientName = "Self";
  }

  const testNameLower = order.test_name?.toLowerCase() || "";
  const labNameLower = order.lab_name?.toLowerCase() || "";

  const isDoctorConsultation = 
    testNameLower.includes("consult") || 
    testNameLower.includes("doctor") || 
    testNameLower.includes("call") || 
    labNameLower.includes("dr.") || 
    labNameLower.includes("doctor");

  const isOnlineCall = testNameLower.includes("video") || testNameLower.includes("audio") || testNameLower.includes("call");

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

          {/* Patient Name */}
          <div className="flex items-center gap-2 py-2.5 border-t border-border">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Patient:</span>
            <span className="text-sm font-semibold text-foreground uppercase">{patientName}</span>
          </div>

          {/* Lab Name */}
          {order.lab_name && (
            <div className="flex items-center gap-2 py-2.5 border-t border-border">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Lab:</span>
              <span className="text-sm font-semibold text-foreground">{order.lab_name}</span>
            </div>
          )}

          {/* Order Placed Time */}
          {order.created_at && (
            <div className="flex items-center gap-2 py-2.5 border-t border-border">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground flex-1">Order Placed:</span>
              <span className="text-sm font-semibold text-foreground text-right">
                {format(new Date(order.created_at), "MMM dd, yyyy • hh:mm a")}
              </span>
            </div>
          )}

          {/* Schedule */}
          {(order.scheduled_date || order.scheduled_time_slot) && (
            <div className="flex items-start gap-2 py-2.5 border-t border-border">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex flex-col flex-1 gap-1">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Booking Time:</span>
                  <span className="text-sm font-semibold text-foreground text-right">
                    {order.scheduled_date && format(new Date(order.scheduled_date), "MMM dd, yyyy")}
                    {order.scheduled_time_slot && ` • ${order.scheduled_time_slot}`}
                  </span>
                </div>
                {(order as any).is_rescheduled && (order as any).rescheduled_date && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Rescheduled Time:</span>
                    <span className="text-sm font-semibold text-amber-600 text-right">
                      {format(new Date((order as any).rescheduled_date), "MMM dd, yyyy")}
                      {(order as any).rescheduled_time_slot && ` • ${(order as any).rescheduled_time_slot}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Method */}
          {order.payment_method && (
            <div className="flex items-center gap-2 py-2.5 border-t border-border">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Payment:</span>
              <span className="text-sm font-semibold text-foreground capitalize">
                {order.payment_method.replace(/_/g, ' ')}
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
                {order.delivery_partner_phone && !["completed", "report_ready", "report_delivered"].includes(order.status || "") && (
                  <a
                    href={`tel:${order.delivery_partner_phone}`}
                    className="flex items-center gap-1 text-sm text-primary mt-0.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {order.delivery_partner_phone}
                  </a>
                )}
              </div>
              {order.delivery_partner_phone && !["completed", "report_ready", "report_delivered"].includes(order.status || "") && (
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
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FlaskConical className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Direct Lab Collection</p>
                <p className="text-xs text-muted-foreground mt-0.5">A lab professional will collect your sample directly</p>
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
                {activeWorkflowSteps.map((step, index) => {
                  const isCompleted = index <= completedIndex;
                  const isCurrent = completedIndex >= activeWorkflowSteps.length - 1
                    ? index === completedIndex
                    : index === completedIndex + 1;
                  const isLast = index === activeWorkflowSteps.length - 1;
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

                        {/* Awaiting the lab's acceptance in the Partner dashboard */}
                        {step.key === "accepted" && !isCompleted && !isCancelled && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            Your order will be accepted by the lab shortly.
                          </p>
                        )}

                        {/* Customer-driven collection confirmation */}
                        {step.key === "collection" && !isCancelled && (
                          <>
                            {collectionDone ? null : showCollectionPrompt ? (
                              <CollectionConfirmPrompt
                                orderId={order.id}
                                scheduledDate={order.scheduled_date}
                                scheduledTimeSlot={order.scheduled_time_slot}
                                onConfirmed={(status) => {
                                  queryClient.setQueryData(
                                    ["order", order.id, supabaseUserId],
                                    (old: any) => (old ? { ...old, order: { ...old.order, status } } : old)
                                  );
                                  queryClient.invalidateQueries({ queryKey: ["order", order.id] });
                                  queryClient.invalidateQueries({ queryKey: ["orders"] });
                                }}
                              />
                            ) : statusLower === "collection_pending" ? (
                              <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
                                You reported that your sample wasn’t collected. The lab has been notified.
                              </p>
                            ) : labAccepted ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                The lab is assigning a collection partner for your sample.
                              </p>
                            ) : null}
                          </>
                        )}



                        {/* Report actions */}
                        {(step.key === "report" || step.key === "completed") && isCompleted && order.report_url && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="soft"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => window.open(order.report_url!, "_blank")}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View {isDoctorConsultation ? "Prescription" : "Report"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={async () => {
                                // Extract file extension from URL, fallback to .pdf
                                const getExtension = (url: string) => {
                                  const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
                                  if (match && ['pdf', 'jpg', 'jpeg', 'png'].includes(match[1].toLowerCase())) {
                                    return `.${match[1].toLowerCase()}`;
                                  }
                                  return '.pdf';
                                };
                                
                                const ext = getExtension(order.report_url!);
                                const filename = `report-${order.order_number || order.id.slice(0, 8)}${ext}`;

                                try {
                                  const response = await fetch(order.report_url!);
                                  const blob = await response.blob();
                                  
                                  let finalExt = ext;
                                  if (ext === '.pdf' && blob.type.includes('image/jpeg')) finalExt = '.jpg';
                                  else if (ext === '.pdf' && blob.type.includes('image/png')) finalExt = '.png';
                                  
                                  const finalFilename = `report-${order.order_number || order.id.slice(0, 8)}${finalExt}`;

                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.href = url;
                                  link.download = finalFilename;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (error) {
                                  console.error("Download failed:", error);
                                  // Fallback
                                  const link = document.createElement("a");
                                  link.href = order.report_url!;
                                  link.target = "_blank";
                                  link.download = filename;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
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
                            View {isDoctorConsultation ? "Prescriptions" : "Reports"}
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
          {isOnlineCall && !isCancelled && completedIndex < 4 && (
            <Button
              className="w-full h-12 rounded-2xl gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => navigate(`/call/${order.id}`)}
            >
              <Video className="w-5 h-5" />
              Join Video / Audio Call
            </Button>
          )}

          {!isCancelled && !partnerAssigned && completedIndex < 1 && (
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="w-5 h-5" />
              Cancel or Reschedule Order
            </Button>
          )}
          {!isCancelled && (partnerAssigned || completedIndex >= 1) && completedIndex < 3 && (
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
          labId={order.lab_id}
          onSuccess={(mode) => {
            queryClient.invalidateQueries({ queryKey: ["order", order.id] });
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
