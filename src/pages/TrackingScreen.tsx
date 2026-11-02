import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Check,
  ChevronRight,
  LifeBuoy,
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
import { simplifyTestName } from "@/utils/simplify-test-name";

const workflowSteps = [
  { key: "accepted", label: "Order accepted", icon: CheckCircle },
  { key: "collection", label: "Sample collection", icon: FlaskConical },
  { key: "report", label: "Report ready", icon: FileText },
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

  const vitalRegex = /(?:home\s*bp|bp\s*check|blood\s*pressure|ecg|electrocardiogram)/i;
  const isVitalsOrder = testNames.length > 0
    ? testNames.every(name => vitalRegex.test(name))
    : (vitalRegex.test(order.test_name || "") || vitalRegex.test(order.order_number || ""));
  const activeWorkflowSteps = isVitalsOrder ? [
    { key: "confirmed", label: "Ordered", icon: CheckCircle },
    { key: "accepted", label: "Accepted", icon: CheckCircle },
    { key: "collection", label: "Service partner assigned", icon: UserCheck },
    { key: "completed", label: "Completed", icon: CheckCircle },
  ] : workflowSteps;

  const completedIndex = isVitalsOrder
    ? (["completed", "report_ready", "report_delivered", "checked"].includes(order.status?.toLowerCase() || "")
      ? 3
      : ASSIGNED_STATUSES.includes(order.status?.toLowerCase() || "") || !!order.delivery_partner_name
        ? 2
        : order.status?.toLowerCase() === "accepted" || order.status?.toLowerCase() === "collection_pending"
          ? 1
          : 0)
    : getCompletedIndex(order.status, order.delivery_partner_name);
  const isCancelled = order.status === "cancelled";
  const statusInfo = isVitalsOrder && ["completed", "checked", "report_ready", "report_delivered"].includes(order.status?.toLowerCase() || "")
    ? { label: "Completed", tone: "bg-success/15 text-success" }
    : getDisplayStatus(order.status);

  const statusLower = order.status?.toLowerCase() || "";
  const labAccepted = isLabAccepted(order.status, order.delivery_partner_name);
  const partnerAssigned =
    ASSIGNED_STATUSES.includes(statusLower) || !!order.delivery_partner_name;
  const collectionDone =
    isVitalsOrder
      ? ["completed", "checked", "report_ready", "report_delivered"].includes(statusLower)
      : COLLECTED_STATUSES.includes(statusLower) || REPORT_STATUSES.includes(statusLower);
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

  const downloadReport = async () => {
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
  };

  const slotLabel = (slot: string | null | undefined) =>
    slot ? (slot.includes("(") ? slot.substring(slot.indexOf("(") + 1, slot.lastIndexOf(")") > 0 ? slot.lastIndexOf(")") : undefined) : slot) : "";
  const scheduleText = order.scheduled_date
    ? `${format(new Date(order.scheduled_date), "EEE, dd MMM")}${order.scheduled_time_slot ? ` · ${slotLabel(order.scheduled_time_slot)}` : ""}`
    : order.scheduled_time_slot ? slotLabel(order.scheduled_time_slot) : "";
  const isReportReady = REPORT_STATUSES.includes(statusLower) || (isVitalsOrder && collectionDone);
  const partnerWord = isVitalsOrder ? "service" : "collection";

  // One plain sentence on where the order stands, shown at the top.
  const headline = isCancelled
    ? { title: "Order cancelled", detail: "This order was cancelled. Any amount paid is refunded as per policy." }
    : isReportReady
      ? isVitalsOrder
        ? { title: "Service completed", detail: "Your home check is done." }
        : { title: "Your report is ready", detail: "View or download it below." }
      : collectionDone
        ? { title: "Sample collected", detail: "The lab is processing your sample. You'll be notified when the report is ready." }
        : statusLower === "collection_pending"
          ? { title: isVitalsOrder ? "Visit not completed" : "Sample not collected", detail: "You reported this to the lab. They will contact you to fix it." }
          : partnerAssigned
            ? { title: `${isVitalsOrder ? "Service" : "Collection"} partner assigned`, detail: `${order.delivery_partner_name || "A partner"} will visit you${scheduleText ? ` on ${scheduleText}` : ""}.` }
            : labAccepted
              ? { title: "Order accepted", detail: `The lab is assigning a ${partnerWord} partner.` }
              : { title: "Waiting for the lab", detail: "The lab will accept your order shortly." };

  const paymentLabel = (() => {
    const m = order.payment_method?.toLowerCase();
    if (!m) return null;
    if (m === 'cod') return isVitalsOrder ? 'Pay after the visit' : 'Pay after blood collection';
    if (m === 'upi') return 'UPI';
    if (m === 'card') return 'Credit / Debit Card';
    if (m === 'online') return 'Pay Online';
    return order.payment_method!.replace(/_/g, ' ');
  })();
  const discount = Number(order.discount) || 0;
  const otherCharges = Number(order.total) - Number(order.subtotal) + discount;
  const showBreakdown = Number(order.subtotal) > 0 && otherCharges >= 0;
  const testCount = testNames.length || orderItems.length || 1;

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Order Details" />

      <div className="px-4 pb-8 space-y-3">
        {/* Where the order stands */}
        <section className="mt-3 rounded-2xl border border-border/60 bg-card shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Order <span className="font-semibold text-foreground">{order.order_number || `#${order.id.slice(0, 8)}`}</span>
            </p>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${statusInfo.tone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusInfo.label}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-extrabold text-foreground leading-tight">{headline.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">{headline.detail}</p>
          {scheduleText && !isCancelled && !isReportReady && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{isVitalsOrder ? "Visit" : "Sample collection"}</p>
                <p className="text-sm font-bold text-foreground">{scheduleText}</p>
              </div>
            </div>
          )}
          {isReportReady && order.report_url && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button className="h-11 rounded-xl" onClick={() => window.open(order.report_url!, "_blank")}>
                <Eye className="w-4 h-4 mr-1.5" /> View {isDoctorConsultation ? "prescription" : "report"}
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={downloadReport}>
                <Download className="w-4 h-4 mr-1.5" /> Download
              </Button>
            </div>
          )}
          {isReportReady && !order.report_url && !isVitalsOrder && (
            <Button variant="soft" className="mt-3 w-full h-11 rounded-xl" onClick={() => navigate("/reports")}>
              <FileText className="w-4 h-4 mr-1.5" /> View {isDoctorConsultation ? "prescriptions" : "reports"}
            </Button>
          )}
          {isOnlineCall && !isCancelled && completedIndex < 4 && (
            <Button
              className="mt-3 w-full h-11 rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => navigate(`/call/${order.id}`)}
            >
              <Video className="w-4 h-4" />
              Join video / audio call
            </Button>
          )}
        </section>

        {/* Progress */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Progress</h3>

          {isCancelled ? (
            <div className="flex items-center gap-3 rounded-xl bg-destructive/5 px-3 py-3">
              <XCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm font-semibold text-destructive">This order was cancelled</p>
            </div>
          ) : (
            <ol className="relative">
              {activeWorkflowSteps.map((step, index) => {
                const isCompleted = index <= completedIndex;
                const isCurrent = completedIndex >= activeWorkflowSteps.length - 1
                  ? index === completedIndex
                  : index === completedIndex + 1;
                const isLast = index === activeWorkflowSteps.length - 1;
                const StepIcon = step.icon;

                return (
                  <li key={step.key} className="flex items-start gap-3 relative">
                    {/* Vertical connector */}
                    {!isLast && (
                      <div
                        className={`absolute left-[13px] top-8 w-0.5 h-[calc(100%-20px)] ${
                          index < completedIndex ? "bg-success" : "bg-border"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-success text-white"
                          : isCurrent
                          ? "bg-card ring-2 ring-primary text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <StepIcon className="w-3.5 h-3.5" />}
                    </div>

                    <div className={`flex-1 min-w-0 pt-1 ${isLast ? "pb-0" : "pb-5"}`}>
                      <p className={`text-sm font-semibold ${
                        isCompleted ? "text-foreground" : isCurrent ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </p>

                      {/* Awaiting the lab's acceptance in the Partner dashboard */}
                      {step.key === "accepted" && !isCompleted && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Your order will be accepted by the lab shortly.
                        </p>
                      )}

                      {/* Customer-driven collection confirmation */}
                      {step.key === "collection" && (
                        <>
                          {collectionDone ? null : showCollectionPrompt ? (
                            <CollectionConfirmPrompt
                              orderId={order.id}
                              scheduledDate={order.scheduled_date}
                              scheduledTimeSlot={order.scheduled_time_slot}
                              partnerPhone={order.delivery_partner_phone}
                              serviceType={isVitalsOrder ? "vitals" : "blood"}
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
                            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                              You reported that your {isVitalsOrder ? "service wasn’t completed" : "sample wasn’t collected"}. The lab has been notified.
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Collection / service partner */}
        {!isCancelled && (
          <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">{isVitalsOrder ? "Service partner" : "Collection partner"}</h3>
            {order.delivery_partner_name ? (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{order.delivery_partner_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.delivery_partner_phone && !isReportReady ? `+91 ${order.delivery_partner_phone.replace(/^\+?91/, "")}` : "Assigned by the lab"}
                  </p>
                </div>
                {order.delivery_partner_phone && !["completed", "report_ready", "report_delivered"].includes(order.status || "") && (
                  <a
                    href={`tel:${order.delivery_partner_phone}`}
                    aria-label="Call partner"
                    className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 active:scale-95 transition"
                  >
                    <Phone className="w-4.5 h-4.5" />
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Not assigned yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {labAccepted
                      ? `The lab will assign a ${partnerWord} partner before your slot.`
                      : "You'll see the partner here once the lab accepts your order."}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Booking details */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-foreground">Booking details</h3>
            <span className="text-[11px] font-semibold text-muted-foreground">{testCount} {testCount === 1 ? "test" : "tests"}</span>
          </div>

          <ul className="px-4 pb-1 space-y-1.5">
            {(testNames.length > 0 ? testNames : [order.test_name || "Lab Test"]).map((name, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
                <FlaskConical className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm font-semibold text-foreground leading-snug">{testNames.length > 0 ? simplifyTestName(name) : name}</p>
              </li>
            ))}
          </ul>

          <dl className="px-4 py-1 divide-y divide-border/50">
            <div className="flex items-center gap-2.5 py-3">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <dt className="text-xs text-muted-foreground flex-1">Patient</dt>
              <dd className="text-sm font-semibold text-foreground text-right">{patientName}</dd>
            </div>
            {order.lab_name && (
              <div className="flex items-center gap-2.5 py-3">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <dt className="text-xs text-muted-foreground flex-1">Lab</dt>
                <dd className="text-sm font-semibold text-foreground text-right">{order.lab_name}</dd>
              </div>
            )}
            {scheduleText && (
              <div className="flex items-start gap-2.5 py-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <dt className="text-xs text-muted-foreground flex-1">{isVitalsOrder ? "Visit" : "Collection"}</dt>
                <dd className="text-right">
                  <p className="text-sm font-semibold text-foreground">{scheduleText}</p>
                  {(order as any).is_rescheduled && (order as any).rescheduled_date && (
                    <p className="text-xs font-semibold text-amber-600 mt-0.5">
                      Rescheduled to {format(new Date((order as any).rescheduled_date), "dd MMM")}
                      {(order as any).rescheduled_time_slot && ` · ${slotLabel((order as any).rescheduled_time_slot)}`}
                    </p>
                  )}
                </dd>
              </div>
            )}
            {order.created_at && (
              <div className="flex items-center gap-2.5 py-3">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <dt className="text-xs text-muted-foreground flex-1">Booked on</dt>
                <dd className="text-sm font-semibold text-foreground text-right">
                  {format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Payment */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Payment</h3>
          <dl className="space-y-2 text-sm">
            {showBreakdown && (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{testCount === 1 ? "Test price" : "Tests total"}</dt>
                  <dd className="font-semibold text-foreground tabular-nums">₹{order.subtotal}</dd>
                </div>
                {otherCharges > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Home collection & other charges</dt>
                    <dd className="font-semibold text-foreground tabular-nums">₹{otherCharges}</dd>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="font-semibold text-success tabular-nums">−₹{discount}</dd>
                  </div>
                )}
              </>
            )}
            <div className={`flex justify-between items-baseline ${showBreakdown ? "pt-2 border-t border-border/60" : ""}`}>
              <dt className="font-bold text-foreground">Total</dt>
              <dd className="text-xl font-black text-foreground tabular-nums">₹{order.total}</dd>
            </div>
          </dl>
          {paymentLabel && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
              <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold text-foreground">{paymentLabel}</span>
              {/* Pay-later orders can carry a "completed" status before any money changes hands, so only online payments say Paid. */}
              {order.payment_method?.toLowerCase() !== "cod" && ["paid", "completed", "success"].includes(order.payment_status?.toLowerCase() || "") && (
                <span className="ml-auto text-[11px] font-bold text-success">Paid</span>
              )}
            </div>
          )}
        </section>

        {/* Help & changes */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-sm divide-y divide-border/60 overflow-hidden">
          {!isCancelled && !partnerAssigned && (isVitalsOrder ? !collectionDone : completedIndex < 1) && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/50"
            >
              <XCircle className="w-5 h-5 text-destructive shrink-0" />
              <span className="flex-1 text-sm font-semibold text-destructive">Cancel or reschedule</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/50"
          >
            <LifeBuoy className="w-5 h-5 text-primary shrink-0" />
            <span className="flex-1 text-sm font-semibold text-foreground">Need help with this order?</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </section>
        {!isCancelled && (partnerAssigned || (!isVitalsOrder && completedIndex >= 1)) && !collectionDone && (
          <p className="text-xs text-muted-foreground text-center px-4">
            Cancellation is unavailable — a {partnerWord} partner has been assigned to your order.
          </p>
        )}

        <Button variant="ghost" className="w-full h-11 rounded-xl gap-2 text-muted-foreground" onClick={() => navigate("/home")}>
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
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
