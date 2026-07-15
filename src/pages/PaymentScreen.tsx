import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Tag, Calendar, Clock, MapPin, ChevronDown, ChevronUp, User, Wallet, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BookingStepper from "@/components/BookingStepper";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";
import { evaluateLabServiceability } from "@/lib/labServiceability";

interface PaymentState {
  cartItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    familyMemberId?: string;
    packageId?: string;
    labId?: string;
    labName?: string;
    vendorId?: string;
    category?: string;
    kind?: "test" | "package";
  }>;

  addressId?: string | null;
  scheduledDate?: string | null;
  scheduledTimeSlot?: string | null;
  subtotal: number;
  selectedLabName?: string;
  selectedLabId?: string;
  labVendorId?: string | null;
  patientName?: string;
  patientAge?: number | string | null;
  patientGender?: string | null;
  patientPhone?: string | null;
  contactPhone?: string | null;
}

const PaymentScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subtotal: cartSubtotal, clearCart, items: cartItemsState, removeFromCart } = useCart();
  const paymentState = location.state as PaymentState | undefined;
  const { pincode: userPincode } = useUserPincode();

  const stateSubtotal = paymentState?.subtotal || cartSubtotal;
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(true);
  const [orderOpen, setOrderOpen] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState({ id: "cod", name: "Pay on Delivery" });
  const [verifyingServiceability, setVerifyingServiceability] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  // Listen for payment method selection from PaymentMethodsScreen
  useEffect(() => {
    const checkMethod = () => {
      const stored = sessionStorage.getItem("bloodlyn-selected-payment");
      if (stored) {
        setSelectedPaymentMethod(JSON.parse(stored));
        sessionStorage.removeItem("bloodlyn-selected-payment");
      }
    };
    checkMethod();
    // Also check on focus (when navigating back)
    window.addEventListener("focus", checkMethod);
    return () => window.removeEventListener("focus", checkMethod);
  }, []);

  // Also check when location changes (navigating back from payment methods)
  useEffect(() => {
    const stored = sessionStorage.getItem("bloodlyn-selected-payment");
    if (stored) {
      setSelectedPaymentMethod(JSON.parse(stored));
      sessionStorage.removeItem("bloodlyn-selected-payment");
    }
  }, [location]);

  const discount = couponApplied ? 100 : 0;
  const total = stateSubtotal - discount;

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "HEALTH100") setCouponApplied(true);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Today";
    try {
      // Parse YYYY-MM-DD as a LOCAL date (avoid UTC midnight shift)
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
      const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });
    } catch { return dateStr; }
  };

  const mapOrderError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? "");
    const lower = message.toLowerCase();

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

  const getDoctorServicePrefix = (item: { id?: string; name?: string; labId?: string | null }) => {
    const id = String(item.id ?? "").toLowerCase();
    const name = String(item.name ?? "").toLowerCase();
    if (id.startsWith("doc-video-") || /^video call with /.test(name)) return "doc-video";
    if (id.startsWith("doc-audio-") || /^audio call with /.test(name)) return "doc-audio";
    if (id.startsWith("doc-") || /^physical appointment with /.test(name) || item.labId === "doctor-service") return "doc";
    return null;
  };

  const isServiceItem = (item: { id?: string; name?: string; labId?: string | null }) => {
    const id = String(item.id ?? "").toLowerCase();
    const name = String(item.name ?? "").toLowerCase();
    return (
      isDoctorServiceItem(item) ||
      id.startsWith("physio-") ||
      id.startsWith("ecg-") ||
      item.labId === "physio-service" ||
      item.labId === "ecg-service" ||
      name.includes(" with ")
    );
  };

  const handlePayment = async () => {
    if (isSubmittingOrder) return;

    const cartItems = paymentState?.cartItems || [];
    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Please add tests before placing an order.");
      navigate("/cart");
      return;
    }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rawLabId = paymentState?.selectedLabId || cartItems[0]?.labId;
    // Service pseudo-labs (doctor-service, ecg-service, physio-service) are not real diagnostic centers.
    const labId = rawLabId && UUID_RE.test(rawLabId) ? rawLabId : null;
    const labName = paymentState?.selectedLabName || cartItems[0]?.labName || null;
    const isServiceOnlyOrder = cartItems.every(isServiceItem);

    try {
      setIsSubmittingOrder(true);
      setVerifyingServiceability(true);

      const rawVendorId = paymentState?.cartItems?.[0]?.vendorId || paymentState?.labVendorId || null;
      let resolvedVendorId = rawVendorId && UUID_RE.test(rawVendorId) ? rawVendorId : null;
      if (labId && !isServiceOnlyOrder) {
        const [{ data: lab, error: labError }, { data: address, error: addressError }] = await Promise.all([
          supabase
            .from("diagnostic_centers")
            .select("pincode, service_pincodes, is_active, latitude, longitude, vendor_id")
            .eq("id", labId)
            .maybeSingle(),
          paymentState?.addressId
            ? supabase
                .from("addresses")
                .select("pincode, latitude, longitude")
                .eq("id", paymentState.addressId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (labError) throw labError;
        if (addressError) throw addressError;
        if (!lab) {
          toast.error("Selected lab is no longer available. Please pick another lab.");
          return;
        }

        if (lab.is_active === false) {
          toast.error("Selected lab is currently closed. Please choose another lab.");
          return;
        }

        const targetPincode = address?.pincode?.trim() || userPincode;
        if (targetPincode && !labServesPincode(lab as any, targetPincode)) {
          toast.error(`This lab does not service your pincode (${targetPincode}). Please choose another lab.`);
          return;
        }

        const serviceability = evaluateLabServiceability(
          lab as any,
          address ? { pincode: address.pincode, latitude: address.latitude, longitude: address.longitude } : { pincode: targetPincode },
        );

        if (!serviceability.serviceable) {
          toast.error(
            serviceability.reason === "distance"
              ? "This lab does not service your selected area."
              : "Selected lab is unavailable for this booking."
          );
          return;
        }

        resolvedVendorId = lab.vendor_id || resolvedVendorId;
      }

      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      const accessToken = refreshed?.session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;

      if (refreshError || !accessToken) {
        toast.error("Your session expired. Please log in again.");
        navigate("/login");
        return;
      }

      // Stable idempotency key for THIS checkout session — generated once
      // and reused on every retry (double-tap, network glitch, StrictMode
      // double-invoke). The server enforces uniqueness via a partial UNIQUE
      // index on orders(user_id, client_idempotency_key), so even a perfectly
      // timed concurrent retry cannot produce two orders.
      const idempotencyKey =
        idempotencyKeyRef.current ||
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      idempotencyKeyRef.current = idempotencyKey;

      // Normalize item IDs to satisfy edge-function validation.
      // Accepts: UUID, UUID-prefixed (uuid-suffix), or known synthetic prefixes.
      // Anything else gets a `dc-` prefix so the function treats it as an unresolved
      // lab item and uses the client-supplied price as a safe fallback.
      const SYNTHETIC_PREFIX = /^(ecg|ai|dc|reorder|pkg|bridge|lifecare|doc|physio)-/i;
      const UUID_PREFIXED = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-.+)?$/i;
      const normalizeItemId = (raw: unknown, item?: { name?: string; labId?: string | null }): string => {
        const id = String(raw ?? "").trim();
        const doctorPrefix = getDoctorServicePrefix({ id, name: item?.name, labId: item?.labId });
        if (doctorPrefix) {
          const rawDoctorId = id.replace(/^doc-(video-|audio-)?/i, "") || crypto.randomUUID();
          const safeDoctorId = rawDoctorId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 90);
          return `${doctorPrefix}-${safeDoctorId}`;
        }
        if (SYNTHETIC_PREFIX.test(id) || UUID_PREFIXED.test(id)) return id;
        if (!id) return `dc-${crypto.randomUUID()}`;
        // Replace anything non-id-safe and prefix with dc-
        const safe = id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100);
        return `dc-${safe}`;
      };

      const { data: fnData, error: fnError } = await supabase.functions.invoke("create-order", {
        headers: { "Idempotency-Key": idempotencyKey },
        body: {
          cartItems: cartItems.map((item) => {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
            const derivedPackageId = item.packageId || (item.kind === "package" && isUuid ? item.id : null);
            return {
              id: normalizeItemId(item.id, item),
              name: item.name,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
              familyMemberId: item.familyMemberId || null,
              packageId: derivedPackageId,
              category: item.category || undefined,
              labId: (item.labId && UUID_RE.test(item.labId)) ? item.labId : (labId || null),
              labName: item.labName || labName,
              vendorId: (item.vendorId && UUID_RE.test(item.vendorId)) ? item.vendorId : resolvedVendorId,
            };
          }),

          addressId: paymentState?.addressId || null,
          scheduledDate: paymentState?.scheduledDate || null,
          scheduledTimeSlot: paymentState?.scheduledTimeSlot || null,
          subtotal: stateSubtotal,
          discount,
          total,
          paymentMethod: selectedPaymentMethod.id,
          couponCode: couponApplied ? "HEALTH100" : null,
          patientName: paymentState?.patientName,
          patientAge: paymentState?.patientAge,
          patientGender: paymentState?.patientGender,
          patientPhone: paymentState?.patientPhone,
          labId: labId || null,
          labName,
          vendorId: resolvedVendorId,
        },
      });

      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);

      clearCart();

      navigate("/order-success", {
        replace: true,
        state: {
          ...paymentState,
          couponApplied,
          discount,
          total,
          selectedPayment: selectedPaymentMethod.id,
          selectedPaymentName: selectedPaymentMethod.name,
          paymentVerified: true,
          orderId: fnData?.orderId || null,
          orderNumber: fnData?.orderNumber || null,
          vendorId: resolvedVendorId,
          selectedLabName: paymentState?.selectedLabName || labName,
          selectedLabId: paymentState?.selectedLabId || labId,
        },
      });
    } catch (error) {
      console.error("Order placement failed:", error);
      toast.error(mapOrderError(error));
    } finally {
      setVerifyingServiceability(false);
      setIsSubmittingOrder(false);
    }
  };

  return (
    <MobileLayout>
      <ScreenHeader title="Check Out" />
      <BookingStepper currentStep={3} />

      <div className="px-4 pb-32">
        {/* Appointment Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4 mb-4">
          <button onClick={() => setAppointmentOpen(!appointmentOpen)} className="w-full flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Appointment Details</h3>
            {appointmentOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {appointmentOpen && (
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{paymentState?.selectedLabName || "Home Collection"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{formatDate(paymentState?.scheduledDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{paymentState?.scheduledTimeSlot || "Any time"}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Order Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-4 mb-4">
          <button onClick={() => setOrderOpen(!orderOpen)} className="w-full flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Order Details</h3>
            {orderOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {orderOpen && (
            <div className="mt-3">
              {paymentState?.patientName && (
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground text-sm">{paymentState.patientName}</span>
                </div>
              )}
              <div className="space-y-2">
                {(paymentState?.cartItems || []).map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-foreground flex-1 truncate pr-4">{item.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-foreground font-semibold">₹ {item.price * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Offers & Benefits */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-4">
          <h3 className="text-base font-bold text-foreground mb-3">Offers & Benefits</h3>
          <div className="bg-card rounded-2xl border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Apply Coupon Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-muted border-0 rounded-lg h-9 text-sm"
                    disabled={couponApplied}
                  />
                  <Button variant="soft" size="sm" onClick={applyCoupon} disabled={couponApplied} className="h-9">
                    {couponApplied ? "Applied" : "Apply"}
                  </Button>
                </div>
              </div>
            </div>
            {couponApplied && (
              <Badge variant="softSuccess" className="mt-2 ml-11">
                HEALTH100 applied — ₹100 off
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Bill Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-base font-bold text-foreground mb-3">Bill Summary</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">MRP Total</span>
              <span className="text-foreground">₹ {stateSubtotal}.0/-</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Home Collection</span>
              <span className="text-success font-medium">FREE</span>
            </div>
            {couponApplied && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coupon Discount</span>
                <span className="text-success font-medium">- ₹ {discount}.0/-</span>
              </div>
            )}
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Payable Amount</span>
              <span className="font-bold text-lg text-foreground">₹ {total}.0/-</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Split Pay Button - Select Mode + Pay Now */}
      <div
        className="fixed bottom-0 left-0 right-0 w-full md:max-w-[430px] mx-auto bg-card border-t border-border px-4 py-3 safe-area-bottom z-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <div className="flex items-center gap-0">
          {/* Left: Select Payment Mode */}
          <button
            onClick={() => navigate("/payment-methods", { state: { selectedMethod: selectedPaymentMethod.id, total } })}
            className="flex items-center gap-2 py-3 pr-4 flex-shrink-0"
          >
            <Wallet className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                PAY USING <ChevronUp className="w-3 h-3" />
              </p>
              <p className="text-sm font-bold text-foreground leading-tight">{selectedPaymentMethod.name}</p>
            </div>
          </button>

          {/* Right: Pay Now Button */}
          <Button
            variant="destructive"
            className="flex-1 h-14 rounded-xl text-base font-bold gap-2"
            onClick={handlePayment}
            disabled={verifyingServiceability || isSubmittingOrder}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="text-xs font-semibold opacity-90">₹{total}</span>
              <span className="text-xs opacity-70">TOTAL</span>
            </span>
            <span className="text-base font-bold">
              {isSubmittingOrder ? "Placing…" : verifyingServiceability ? "Verifying…" : "Place Order ›"}
            </span>
          </Button>
        </div>
      </div>

      {isSubmittingOrder && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
            <h3 className="text-base font-bold text-foreground">Placing your order…</h3>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we confirm your booking.</p>
          </div>
        </div>
      )}
    </MobileLayout>
  );
};

export default PaymentScreen;
