import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CreditCard, Package, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { clearStoredPrescription, getStoredPrescription } from "@/lib/order-prescription";
import { useAuth } from "@/hooks/useAuth";

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

const STAGES = [
  {
    id: "verify",
    label: "Verifying payment",
    sublabel: "Securing your transaction…",
    icon: ShieldCheck,
    color: "hsl(201, 88%, 62%)",
  },
  {
    id: "process",
    label: "Processing order",
    sublabel: "Connecting with the lab…",
    icon: CreditCard,
    color: "hsl(262, 83%, 65%)",
  },
  {
    id: "confirm",
    label: "Confirming booking",
    sublabel: "Almost there…",
    icon: Package,
    color: "hsl(142, 71%, 50%)",
  },
  {
    id: "done",
    label: "Order placed!",
    sublabel: "Redirecting you now…",
    icon: CheckCircle2,
    color: "hsl(142, 71%, 45%)",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Floating particles                                                  */
/* ------------------------------------------------------------------ */

const Particle = ({ index }: { index: number }) => {
  const size = 3 + Math.random() * 4;
  const x = Math.random() * 100;
  const delay = Math.random() * 3;
  const duration = 4 + Math.random() * 4;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: -10,
        background: `hsl(${200 + index * 15}, 70%, 80%)`,
        opacity: 0,
      }}
      animate={{
        y: [0, -window.innerHeight * 1.2],
        opacity: [0, 0.35, 0.15, 0],
        x: [0, (Math.random() - 0.5) * 60],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
};

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
    if (lower.includes("out of range") || lower.includes("selected area") || lower.includes("does not service")) {
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
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

      if (fnError) throw fnError;
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
          scheduled_time_slot: paymentState?.scheduledTimeSlot || "Morning Slot",
          test_items: cartItems.map((c: any) => c.name || "Diagnostic Test"),
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

      // Navigate to success
      navigate("/order-success", {
        replace: true,
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
        const resp: Response | undefined = error?.context?.response;
        if (resp && typeof resp.clone === "function") {
          const body = await resp.clone().json().catch(() => null);
          const code = String(body?.code ?? "").toLowerCase();
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
  const StageIcon = stage.icon;
  const progress = ((currentStage + 1) / STAGES.length) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(160deg, hsl(210, 40%, 98%) 0%, hsl(220, 30%, 96%) 40%, hsl(215, 25%, 94%) 100%)",
      }}
    >
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <Particle key={i} index={i} />
        ))}
      </div>

      {/* Ambient glow */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${stage.color}18 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Center card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center px-8 py-10 max-w-sm w-full mx-6"
      >
        {/* Animated icon ring */}
        <div className="relative mb-8">
          {/* Outer rotating ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              width: 120,
              height: 120,
              border: `3px solid transparent`,
              borderTopColor: stage.color,
              borderRightColor: `${stage.color}60`,
            }}
            animate={failed ? {} : { rotate: 360 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Inner pulsing ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 100,
              height: 100,
              top: 10,
              left: 10,
              background: `${stage.color}10`,
              border: `1px solid ${stage.color}30`,
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Icon */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: 120, height: 120 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {failed ? (
                  <Loader2
                    className="animate-spin"
                    style={{ color: "hsl(0, 70%, 60%)" }}
                    size={40}
                    strokeWidth={1.5}
                  />
                ) : (
                  <StageIcon
                    style={{ color: stage.color }}
                    size={40}
                    strokeWidth={1.5}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Stage text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={failed ? "failed" : stage.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="text-center mb-8"
          >
            <h2
              className="text-xl font-bold tracking-tight mb-2"
              style={{ color: failed ? "hsl(0, 65%, 50%)" : "hsl(220, 20%, 15%)" }}
            >
              {failed ? "Something went wrong" : stage.label}
            </h2>
            <p
              className="text-sm"
              style={{ color: "hsl(220, 10%, 50%)" }}
            >
              {failed ? "Taking you back…" : stage.sublabel}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        {!failed && (
          <div className="w-full max-w-[240px]">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "hsl(220, 15%, 90%)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${STAGES[0].color}, ${stage.color})`,
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
            </div>

            {/* Stage dots */}
            <div className="flex justify-between mt-3 px-1">
              {STAGES.map((s, i) => (
                <motion.div
                  key={s.id}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: i <= currentStage ? s.color : "hsl(220, 15%, 82%)",
                  }}
                  animate={
                    i === currentStage
                      ? { scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }
                      : {}
                  }
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Security badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-10 flex items-center gap-2"
        >
          <ShieldCheck size={14} style={{ color: "hsl(142, 50%, 50%)" }} />
          <span
            className="text-xs font-medium"
            style={{ color: "hsl(220, 10%, 55%)" }}
          >
            256-bit SSL encrypted
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentProcessingScreen;
