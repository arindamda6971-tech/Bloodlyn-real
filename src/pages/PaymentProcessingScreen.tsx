import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ShieldCheck, FlaskConical, CalendarCheck, Check, AlertCircle, Lock } from "lucide-react";
import { HeroCheck, HeroDecor } from "@/components/booking/BookingHero";
import { BOOKING_HERO_BG, BRAND_BLUE } from "@/lib/booking-theme";
import { formatINR, formatPassDate, formatTimeWindow, relativeDayPhrase } from "@/lib/booking-format";
import { simplifyTestName } from "@/utils/simplify-test-name";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { clearStoredPrescription, getStoredPrescription } from "@/lib/order-prescription";
import { useAuth } from "@/hooks/useAuth";
import { markCheckoutPlaced } from "@/lib/checkout-key";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ProcessingState {
  /** Pre-validated order payload ready for the edge function */
  orderPayload: Record<string, any>;
  /** Data to forward to /order-success */
  successState: Record<string, any>;
  /** Resolved vendor ID */
  resolvedVendorId: string | null;
  /** One key per payment page visit, so going Back and paying again returns the same order */
  idempotencyKey?: string;

  /** Cart items for bookkeeping */
  cartItems: Array<Record<string, any>>;
  /** Payment state from checkout */
  paymentState: Record<string, any>;
  /** Lab id / name */
  labId: string | null;
  labName: string | null;
  /** Order address string */
  orderAddress: Record<string, any> | null;
  /** Selected payment method */
  selectedPaymentMethod: { id: string; name: string };
}

/* ------------------------------------------------------------------ */
/* Stage config                                                        */
/* ------------------------------------------------------------------ */

// Wording is payment-neutral: most orders are "Pay after blood collection".
const STAGES = [
  { id: "verify", label: "Checking your details", sublabel: "Making sure everything is in order", step: "Verifying your details", doneStep: "Details verified", icon: ShieldCheck },
  { id: "process", label: "Reserving your slot", sublabel: "Sending your booking to the lab", step: "Reserving your slot with the lab", doneStep: "Slot reserved with the lab", icon: FlaskConical },
  { id: "confirm", label: "Confirming your booking", sublabel: "Almost done", step: "Confirming booking", doneStep: "Booking confirmed", icon: CalendarCheck },
  { id: "done", label: "Booking confirmed", sublabel: "Opening your booking", step: "Booking confirmed", doneStep: "Booking confirmed", icon: Check },
] as const;

const WORK_STAGES = STAGES.length - 1;

type StepState = "done" | "active" | "todo";

/** Step marker drawn for the blue background. */
const StepDot = ({ state }: { state: StepState }) =>
  state === "done" ? (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 20 }}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white"
    >
      <Check className="h-3.5 w-3.5" style={{ color: BRAND_BLUE }} strokeWidth={3} />
    </motion.span>
  ) : state === "active" ? (
    <span className="relative block h-6 w-6 shrink-0">
      <span className="absolute inset-0 rounded-full border-2 border-white/25" />
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-white"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </span>
  ) : (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-white/35" />
    </span>
  );

/** White spinning ring around the current stage's icon. */
const StageSpinner = ({ icon: Icon }: { icon: typeof Check }) => (
  <div className="relative h-20 w-20">
    <span className="absolute inset-0 rounded-full border-[3px] border-white/20" />
    <motion.span
      className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-white"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
    />
    <span className="absolute inset-[10px] flex items-center justify-center rounded-full bg-white/15">
      <AnimatePresence mode="wait">
        <motion.span
          key={Icon.displayName ?? String(Icon)}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="h-7 w-7 text-white" />
        </motion.span>
      </AnimatePresence>
    </span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

const PaymentProcessingScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart, items: cartItemsState, removeFromCart } = useCart();
  const { user } = useAuth();

  const processingState = location.state as ProcessingState | undefined;
  const [currentStage, setCurrentStage] = useState(0);
  const [failed, setFailed] = useState(false);
  const hasStarted = useRef(false);

  // Helper functions moved from PaymentScreen
  const isDoctorServiceItem = (item: { id?: string; name?: string; labId?: string | null }) => {
    const id = String(item.id ?? "").toLowerCase();
    const name = String(item.name ?? "").toLowerCase();
    return (
      id.startsWith("doc-") ||
      item.labId === "doctor-service" ||
      /^video call with /.test(name) ||
      /^audio call with /.test(name) ||
      /^physical appointment with /.test(name)
    );
  };

  const mapOrderError = (error: any): string => {
    const msg = error?.message || error?.error || String(error);
    const lower = String(msg).toLowerCase();
    if (lower.includes("cart is empty") || lower.includes("no items")) return "Your cart is empty.";
    if (lower.includes("invalid vendor")) return "Selected lab is unavailable. Please choose another lab.";
    if (lower.includes("out of range") || lower.includes("selected area") || lower.includes("does not service") || lower.includes("does not collect")) {
      return "This lab does not service your selected area.";
    }
    if (lower.includes("unauthorized") || lower.includes("401") || lower.includes("session")) {
      return "Your session expired. Please log in again.";
    }
    if (lower.includes("failed to fetch") || lower.includes("network")) {
      return "Network issue while placing your order. Please try again.";
    }
    return "Unable to place your order. Please try again.";
  };

  const processOrder = useCallback(async () => {
    if (!processingState) {
      toast.error("Missing order data. Redirecting back…");
      navigate("/payment", { replace: true });
      return;
    }

    const {
      orderPayload,
      successState,
      resolvedVendorId,
      cartItems,
      paymentState,
      orderAddress,
      selectedPaymentMethod,
    } = processingState;

    try {
      // Stage 0 → "Verifying payment"
      setCurrentStage(0);

      // Refresh the session if needed
      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token || null;
      const expiresAt = sessionData.session?.expires_at ?? 0;
      const expiringSoon = !expiresAt || expiresAt * 1000 - Date.now() < 60_000;
      if (!accessToken || expiringSoon) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        accessToken = refreshed?.session?.access_token || accessToken;
      }

      if (!accessToken) {
        toast.error("Your session expired. Please log in again.");
        navigate("/login", { replace: true });
        return;
      }

      // Brief pause to let the user see stage 0
      await new Promise((r) => setTimeout(r, 800));

      // Stage 1 → "Processing order"
      setCurrentStage(1);

      // Idempotency key
      const idempotencyKey =
        processingState.idempotencyKey ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

      // Call the edge function with retry
      let fnData: any = null;
      let fnError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase.functions.invoke("create-order", {
          headers: { "Idempotency-Key": idempotencyKey },
          body: orderPayload,
        });
        fnData = res.data;
        fnError = res.error;

        if (!fnError) break;

        const status = fnError?.context?.response?.status;
        const retriable = !status || status >= 500;
        if (!retriable || attempt === 2) break;
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }

      if (fnError) {
        // A 400 carries the reason in its body; surface the out-of-area one.
        const body = await fnError?.context?.json?.().catch(() => null);
        if (body?.code === "lab_not_serviceable" || body?.code === "offer_unavailable") throw new Error(body.error);
        throw fnError;
      }
      if (fnData?.error) throw new Error(fnData.error);

      // Stage 2 → "Confirming booking"
      setCurrentStage(2);
      await new Promise((r) => setTimeout(r, 600));

      // ---- Post-order bookkeeping (must never block success) ----
      try {
        // Save real booking order for partner portal sync
        const newRealOrder = {
          id: fnData?.orderId || `ord-real-${Date.now()}`,
          order_number: fnData?.orderNumber || `BL-${Math.floor(10000 + Math.random() * 90000)}`,
          status: "accepted",
          created_at: new Date().toISOString(),
          customer_name: paymentState?.patientName || "Patient",
          customer_phone: paymentState?.patientPhone || "9876543210",
          customer_address: orderAddress
            ? [orderAddress.address_line1, orderAddress.address_line2, orderAddress.city, orderAddress.state, orderAddress.pincode].filter(Boolean).join(", ")
            : "Address not available locally",
          patient_name: paymentState?.patientName || "Patient",
          patient_age: paymentState?.patientAge || "30",
          patient_gender: paymentState?.patientGender || "Male",
          test_name: cartItems.map((c: any) => c.name).join(" | ") || "Lab Diagnostic Test",
          total_amount: successState?.total || 0,
          payment_status: "Paid",
          payment_method: selectedPaymentMethod.name || "UPI / Online",
          scheduled_date: paymentState?.scheduledDate || new Date().toISOString().slice(0, 10),
          test_items: cartItems.map((c: any) => c.name || "Diagnostic Test"),
          items: cartItems.map((c: any) => ({
            name: c.name || "Diagnostic Test",
            price: Number(c.price) || 0,
            quantity: Number(c.quantity) || 1,
          })),
        };

        try {
          const existingRealStr = localStorage.getItem("BloodLyn_real_orders") || "[]";
          const existingRealList = JSON.parse(existingRealStr);
          existingRealList.unshift(newRealOrder);
          localStorage.setItem("BloodLyn_real_orders", JSON.stringify(existingRealList));
        } catch (e) {
          console.warn("Failed to update BloodLyn_real_orders in localStorage:", e);
        }

        clearCart();
        clearStoredPrescription();


      } catch (postOrderError) {
        console.warn("Post-order bookkeeping failed (order was created):", postOrderError);
      }

      // Stage 3 → "Order placed!"
      setCurrentStage(3);
      await new Promise((r) => setTimeout(r, 900));

      markCheckoutPlaced(idempotencyKey, fnData?.orderId || null);

      // Leave the finished checkout behind: this screen becomes Home in history and
      // the order screen opens on top, so Back from it goes Home instead of walking
      // into the emptied cart, lab and payment pages.
      navigate("/home", { replace: true });
      navigate("/order-success", {
        state: {
          ...successState,
          total: typeof fnData?.total === "number" ? fnData.total : successState.total,
          platformFee: typeof fnData?.platformFee === "number" ? fnData.platformFee : successState.platformFee,
          collectionFee: typeof fnData?.collectionFee === "number" ? fnData.collectionFee : successState.collectionFee,
          orderId: fnData?.orderId || null,
          orderNumber: fnData?.orderNumber || null,
        },
      });
    } catch (error: any) {
      console.error("Order placement failed:", error);
      setFailed(true);

      // Detect vendor_not_approved
      let unavailableCode: string | null = null;
      let unavailableDoctorId: string | null = null;
      try {
        const resp: Response | undefined = error?.context?.response ?? error?.context;
        if (resp && typeof resp.clone === "function") {
          const body = await resp.clone().json().catch(() => null);
          const code = String(body?.code ?? "").toLowerCase();
          if (code === "prescription_required") {
            toast.error("A prescription is required", {
              description: body?.error || "Please attach it in your cart to continue.",
            });
            navigate("/cart", { replace: true });
            return;
          }
          if (code === "vendor_not_approved" || code === "doctor_unavailable") {
            unavailableCode = code;
            unavailableDoctorId = body?.doctor_id ?? null;
          }
        }
      } catch {
        /* ignore parse errors */
      }

      if (unavailableCode) {
        try {
          (cartItemsState || []).forEach((it) => {
            const id = String(it.id ?? "").toLowerCase();
            const labId = String(it.labId ?? "");
            if (id.startsWith("doc-") || labId === "doctor-service") {
              if (!unavailableDoctorId || id.includes(String(unavailableDoctorId).toLowerCase())) {
                removeFromCart(it.id);
              }
            }
          });
        } catch {
          /* ignore */
        }

        toast.error("This doctor is no longer available", {
          description: "The directory has been refreshed. Please pick another doctor.",
        });
        navigate("/doctor-consult", { replace: true });
        return;
      }

      toast.error(mapOrderError(error));

      // Wait a moment then navigate back
      setTimeout(() => {
        navigate("/payment", { replace: true });
      }, 2000);
    }
  }, [processingState, navigate, clearCart, user, cartItemsState, removeFromCart]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    processOrder();
  }, [processOrder]);

  // Redirect if no state provided
  useEffect(() => {
    if (!processingState) {
      navigate("/payment", { replace: true });
    }
  }, [processingState, navigate]);

  const stage = STAGES[currentStage];
  const isDone = currentStage === STAGES.length - 1 && !failed;

  const summary = processingState?.successState ?? {};
  const labName: string | null = processingState?.labName || summary.selectedLabName || null;
  const items: Array<{ name?: string }> = processingState?.cartItems ?? summary.cartItems ?? [];
  const firstTest = items[0]?.name ? simplifyTestName(String(items[0].name)) : null;
  const moreTests = items.length > 1 ? ` + ${items.length - 1} more` : "";
  const day = relativeDayPhrase(summary.scheduledDate)?.replace(/^on /, "") ?? formatPassDate(summary.scheduledDate);
  const when = [day, formatTimeWindow(summary.scheduledTimeSlot)].filter(Boolean).join(" · ");
  const total = typeof summary.total === "number" ? formatINR(summary.total) : null;

  const eyebrow = failed ? "Booking not placed" : isDone ? "All set" : `Step ${currentStage + 1} of ${WORK_STAGES}`;
  const title = failed ? "We couldn't place your order" : stage.label;
  const subtitle = failed
    ? "Nothing was booked. Taking you back to checkout…"
    : stage.id === "process" && labName
      ? `Sending your booking to ${labName}`
      : `${stage.sublabel}…`;

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 z-[9999] overflow-y-auto text-white" style={BOOKING_HERO_BG} role="status" aria-live="polite">
        <HeroDecor drift />

        <div
          className="relative mx-auto flex min-h-full w-full max-w-md flex-col px-6"
          style={{ paddingTop: "max(var(--sat), 24px)", paddingBottom: "max(var(--sab), 20px)" }}
        >
          <div className="flex flex-1 flex-col justify-center py-6">
            {/* Indicator */}
            <div className="h-20">
              {failed ? (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ring-8 ring-white/15"
                >
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </motion.div>
              ) : isDone ? (
                <HeroCheck size={64} />
              ) : (
                <StageSpinner icon={stage.icon} />
              )}
            </div>

            {/* Headline */}
            <AnimatePresence mode="wait">
              <motion.div
                key={failed ? "failed" : stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 min-h-[104px]"
              >
                <p className="text-[14px] font-medium text-white/70">{eyebrow}</p>
                <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
                <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{subtitle}</p>
              </motion.div>
            </AnimatePresence>

            {/* Steps */}
            {!failed && (
              <motion.ol
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 space-y-4 rounded-3xl bg-white/10 p-5 ring-1 ring-inset ring-white/15 backdrop-blur"
              >
                {STAGES.slice(0, WORK_STAGES).map((s, i) => {
                  const state: StepState = isDone || i < currentStage ? "done" : i === currentStage ? "active" : "todo";
                  return (
                    <li key={s.id} className="flex items-center gap-3">
                      <StepDot state={state} />
                      <span className={`text-[14px] ${state === "todo" ? "text-white/50" : "font-semibold text-white"}`}>
                        {state === "done" ? s.doneStep : s.step}
                      </span>
                    </li>
                  );
                })}
              </motion.ol>
            )}

            {/* What is being booked */}
            {(firstTest || when || total) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4"
              >
                <div
                  className={`rounded-3xl bg-white p-4 text-slate-900 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.45)] transition-opacity duration-300 ${failed ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {firstTest && (
                        <p className="truncate text-[14px] font-semibold">
                          {firstTest}
                          {moreTests && <span className="font-medium text-slate-500">{moreTests}</span>}
                        </p>
                      )}
                      {when && <p className="mt-0.5 text-[12px] text-slate-500">{when.charAt(0).toUpperCase() + when.slice(1)}</p>}
                    </div>
                    {total && <p className="shrink-0 text-[16px] font-bold tabular-nums">{total}</p>}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {!failed && (
            <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-white/60">
              <Lock className="h-3 w-3" />
              Secure booking · please keep the app open
            </p>
          )}
        </div>
      </div>
    </MotionConfig>
  );
};

export default PaymentProcessingScreen;
