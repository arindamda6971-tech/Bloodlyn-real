import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Calendar, Clock, MapPin, ChevronDown, ChevronUp, User, Wallet, ChevronRight, HeartPulse, Activity, Star } from "lucide-react";
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
import { usePlatformFeePercent, calcPlatformFee } from "@/hooks/usePlatformFee";
import { getStoredPrescription, clearStoredPrescription } from "@/lib/order-prescription";


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
  const [bpAddonPrice, setBpAddonPrice] = useState<number | null>(null);
  const [bpAddonSelected, setBpAddonSelected] = useState(false);
  const [ecgAddonPrice, setEcgAddonPrice] = useState<number | null>(null);
  const [ecgAddonSelected, setEcgAddonSelected] = useState(false);
  const [labCollectionFee, setLabCollectionFee] = useState<number>(0);
  const [labOffers, setLabOffers] = useState<any[]>([]);
  const [appliedOffer, setAppliedOffer] = useState<any | null>(null);

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

  // ---- Home BP & ECG Check add-ons ------------------------------------------
  const UUID_MATCH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const orderLabId = (() => {
    const raw = paymentState?.selectedLabId || paymentState?.cartItems?.[0]?.labId || "";
    return UUID_MATCH.test(raw) ? raw : null;
  })();
  const alreadyHasBpItem = (paymentState?.cartItems || []).some((i) => String(i.id).startsWith("bp-"));
  const alreadyHasEcgItem = (paymentState?.cartItems || []).some((i) => String(i.id).startsWith("ecg-"));

  useEffect(() => {
    let cancelled = false;
    if (!orderLabId) {
      setBpAddonPrice(null);
      setEcgAddonPrice(null);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("diagnostic_centers")
        .select("offers_home_bp, home_bp_price, offers_home_ecg, ecg_available, ecg_price, blood_collection_fee, home_collection_fee, collection_fee")
        .eq("id", orderLabId)
        .maybeSingle();
      if (cancelled) return;

      if (!alreadyHasBpItem && data?.offers_home_bp === true) {
        // Fall back to 99 instead of 299, but ideally should match Cart
        setBpAddonPrice(Number(data.home_bp_price) || 99);
      } else {
        setBpAddonPrice(null);
        setBpAddonSelected(false);
      }

      if (!alreadyHasEcgItem && (data?.offers_home_ecg === true || data?.ecg_available === true)) {
        // Fall back to 299 instead of 599, but ideally should match Cart
        setEcgAddonPrice(Number(data.ecg_price) || 299);
      } else {
        setEcgAddonPrice(null);
        setEcgAddonSelected(false);
      }

      const fee = Number((data as any)?.blood_collection_fee) || Number((data as any)?.home_collection_fee) || Number((data as any)?.collection_fee) || 0;
      setLabCollectionFee(fee);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderLabId, alreadyHasBpItem, alreadyHasEcgItem]);

  const orderVendorId = (() => {
    const raw = paymentState?.labVendorId || paymentState?.cartItems?.[0]?.vendorId || "";
    return UUID_MATCH.test(raw) ? raw : null;
  })();

  useEffect(() => {
    if (!orderVendorId) return;
    let cancelled = false;
    const fetchOffers = async () => {
      const { data, error } = await supabase
        .from('lab_offers')
        .select('*')
        .eq('lab_id', orderVendorId)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });
      if (!cancelled && data) {
        setLabOffers(data);
      }
    };
    fetchOffers();
    return () => { cancelled = true; };
  }, [orderVendorId]);

  const bpAddonActive = bpAddonPrice !== null && bpAddonSelected;
  const ecgAddonActive = ecgAddonPrice !== null && ecgAddonSelected;
  const activeCartItems = paymentState?.cartItems || cartItemsState;
  
  const cartMaxFee = activeCartItems && activeCartItems.length > 0 
    ? Math.max(...activeCartItems.map(item => item.collectionFee || 0), 0) 
    : 0;
  
  // Use cart max fee, but if 0 (e.g. legacy items or missing test-level fee), fallback to the lab's general collection fee
  const homeCollectionFee = cartMaxFee > 0 ? cartMaxFee : labCollectionFee;

  const effectiveSubtotal = stateSubtotal 
    + (bpAddonActive ? (bpAddonPrice || 0) : 0)
    + (ecgAddonActive ? (ecgAddonPrice || 0) : 0)
    + homeCollectionFee;

  let appliedDiscount = 0;
  let isFreeDelivery = false;
  
  if (appliedOffer) {
    if (appliedOffer.type === 'flat_discount') {
      appliedDiscount = appliedOffer.discount_value || 0;
    } else if (appliedOffer.type === 'percentage_discount') {
      let calc = (stateSubtotal * (appliedOffer.discount_value || 0)) / 100;
      if (appliedOffer.max_discount_cap) {
        calc = Math.min(calc, appliedOffer.max_discount_cap);
      }
      appliedDiscount = calc;
    } else if (appliedOffer.type === 'free_delivery') {
      isFreeDelivery = true;
    }
  } else if (couponApplied) {
    appliedDiscount = 100;
  }

  const discount = Math.round(appliedDiscount);
  const platformFeePercent = usePlatformFeePercent();
  const basePlatformFee = calcPlatformFee(Math.max(0, effectiveSubtotal - discount), platformFeePercent);
  const platformFee = isFreeDelivery ? 0 : basePlatformFee;
  const total = effectiveSubtotal - discount + platformFee;


  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "HEALTH100") {
      setCouponApplied(true);
      setAppliedOffer(null);
    }
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

    const baseItems = paymentState?.cartItems || [];
    const cartItems = [...baseItems];

    if (bpAddonActive && orderLabId) {
      cartItems.push({
        id: `bp-${orderLabId}`,
        name: "Home BP Check (Add-on)",
        price: bpAddonPrice || 0,
        quantity: 1,
        labId: orderLabId,
        labName: paymentState?.selectedLabName || baseItems[0]?.labName,
        vendorId: paymentState?.labVendorId || baseItems[0]?.vendorId,
        familyMemberId: baseItems[0]?.familyMemberId,
      });
    }

    if (ecgAddonActive && orderLabId) {
      cartItems.push({
        id: `ecg-${orderLabId}-addon`,
        name: "Home ECG Check (Add-on)",
        price: ecgAddonPrice || 0,
        quantity: 1,
        labId: orderLabId,
        labName: paymentState?.selectedLabName || baseItems[0]?.labName,
        vendorId: paymentState?.labVendorId || baseItems[0]?.vendorId,
        familyMemberId: baseItems[0]?.familyMemberId,
      });
    }
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

      // Use the existing session; only refresh when it is about to expire.
      // Forcing a refresh on every tap made the first "Place Order" tap fail
      // intermittently (refresh token races), which is why users had to tap twice.
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
      const SYNTHETIC_PREFIX = /^(ecg|ai|dc|reorder|pkg|bridge|lifecare|doc|physio|bp)-/i;
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

      const orderPayload = {
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
        subtotal: effectiveSubtotal,
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
        // Optional prescription attached in the cart — shared with the lab
        prescriptionUrl: getStoredPrescription()?.url || null,
      };


      // Transport-level hiccups (WebView fetch abort, cold start, 5xx) used to
      // surface as an error even though the order was already created — the user
      // then had to tap "Place Order" a second time to reach the success screen.
      // The Idempotency-Key makes retries safe, so retry automatically here and
      // let the server return the already-created order.
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

        // Only retry when there is no application-level response body
        // (i.e. a network/transport failure or a 5xx), never on validation errors.
        const status = fnError?.context?.response?.status;
        const retriable = !status || status >= 500;
        if (!retriable || attempt === 2) break;
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }

      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);


      // Post-order bookkeeping must never block the success screen.
      try {
      // Insert appointment into Supabase appointments table for doctor services
      for (const rawItem of cartItems) {
        const item = rawItem as any;
        if (isDoctorServiceItem(item)) {
          const rawDocId = String(item.doctorId || item.vendorId || item.id || "").replace(/^doc-(video-|audio-)?/i, "");
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawDocId);
          if (isUuid) {
            const typePrefix = getDoctorServicePrefix(item);
            const mode = typePrefix === "doc-video" ? "video" : typePrefix === "doc-audio" ? "audio" : "in_clinic";
            const apptPayload = {
              doctor_id: rawDocId,
              patient_name: item.patientName || paymentState?.patientName || "Patient",
              patient_phone: paymentState?.patientPhone || "",
              patient_age: paymentState?.patientAge ? Number(paymentState.patientAge) : 30,
              patient_gender: paymentState?.patientGender || "Male",
              scheduled_at: paymentState?.scheduledDate ? new Date(paymentState.scheduledDate).toISOString() : new Date().toISOString(),
              mode,
              symptoms: item.symptoms || "Doctor Consultation",
              fee: Number(item.price) || 0,
              status: "pending",
              source: "main_app",
              external_booking_id: fnData?.orderId || fnData?.id || null,
            };
            try {
              // Now securely handled by create-order Edge Function
              // await (supabase as any).from("appointments").insert(apptPayload);
            } catch (e) {
              console.warn("Failed to insert appointment row:", e);
            }
          }
        }
      }

      // Save real booking order for partner portal sync

      const newRealOrder = {
        id: fnData?.orderId || `ord-real-${Date.now()}`,
        order_number: fnData?.orderNumber || `BL-${Math.floor(10000 + Math.random() * 90000)}`,
        status: "accepted",
        created_at: new Date().toISOString(),
        customer_name: paymentState?.patientName || "Patient",
        customer_phone: paymentState?.patientPhone || "9876543210",
        patient_name: paymentState?.patientName || "Patient",
        patient_age: paymentState?.patientAge || "30",
        patient_gender: paymentState?.patientGender || "Male",
        test_name: cartItems.map((c: any) => c.name).join(", ") || "Lab Diagnostic Test",
        total_amount: total,
        payment_status: "Paid",
        payment_method: selectedPaymentMethod.name || "UPI / Online",
        scheduled_date: paymentState?.scheduledDate || new Date().toISOString().slice(0, 10),
        scheduled_time_slot: paymentState?.scheduledTimeSlot || "Morning Slot",
        test_items: cartItems.map((c: any) => c.name || "Diagnostic Test"),
      };

      try {
        // Now securely handled by create-order Edge Function
        // await (supabase as any).from("blood_lyn_orders").insert([newRealOrder]);
      } catch (e) {
        console.warn("Failed to insert blood_lyn_orders row:", e);
      }

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

      navigate("/order-success", {
        replace: true,
        state: {
          ...paymentState,
          cartItems,
          subtotal: effectiveSubtotal,
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
    } catch (error: any) {
      console.error("Order placement failed:", error);

      // Detect vendor_not_approved from the edge function response body.
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
      } catch { /* ignore parse errors */ }

      if (unavailableCode) {
        // Drop any doctor consult items from cart so the user can't retry.
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
        } catch { /* ignore */ }

        toast.error("This doctor is no longer available", {
          description: "The directory has been refreshed. Please pick another doctor.",
        });
        // Force a fresh directory fetch on the consult screen (no retry here).
        navigate("/doctor-consult", { replace: true });
        return;
      }

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

      <div className="px-4 pb-28">
        {/* Appointment Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-2xl border border-border/70 shadow-sm overflow-hidden mb-3">
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" aria-hidden />
          <div className="p-3.5 pl-5">
            <button onClick={() => setAppointmentOpen(!appointmentOpen)} className="w-full flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground tracking-tight">Appointment Details</h3>
              {appointmentOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {appointmentOpen && (
              <div className="mt-3 grid grid-cols-3 divide-x divide-border/60">
                <div className="flex items-center gap-2 pr-2 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lab</p>
                    <p className="text-xs font-bold text-foreground truncate">{paymentState?.selectedLabName || "Home Collection"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="text-xs font-bold text-foreground truncate">{formatDate(paymentState?.scheduledDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-2 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time</p>
                    <p className="text-xs font-bold text-foreground truncate">{paymentState?.scheduledTimeSlot || "Any time"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Order Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border/70 shadow-sm p-4 mb-4">
          <button onClick={() => setOrderOpen(!orderOpen)} className="w-full flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground tracking-tight">Order Details</h3>
            {orderOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {orderOpen && (
            <div className="mt-3">
              {paymentState?.patientName && (
                <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-dashed border-border">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Member</p>
                    <p className="font-bold text-foreground text-sm truncate">{paymentState.patientName}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {(paymentState?.cartItems || []).map((item) => (
                  <div key={item.id} className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-foreground font-semibold flex-1 truncate">{item.name}</span>
                    <span className="text-foreground font-bold tabular-nums shrink-0">₹ {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {bpAddonPrice !== null && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            onClick={() => setBpAddonSelected((v) => !v)}
            aria-pressed={bpAddonSelected}
            className={`w-full text-left mb-3 rounded-2xl border p-3 transition-colors ${
              bpAddonSelected ? "border-primary bg-primary/5" : "border-border/70 bg-primary/[0.03]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <HeartPulse className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">Add Home BP Check</p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    <Star className="w-2 h-2" /> Recommended
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end">
                <p className="text-sm font-bold text-foreground">
                  {bpAddonPrice > 0 ? `₹ ${bpAddonPrice}` : "FREE"}
                </p>
                <p className={`text-[10px] font-bold ${bpAddonSelected ? "text-primary" : "text-primary/80"}`}>
                  {bpAddonSelected ? "Added" : "Add"}
                </p>
              </div>
            </div>
          </motion.button>
        )}

        {ecgAddonPrice !== null && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            onClick={() => setEcgAddonSelected((v) => !v)}
            aria-pressed={ecgAddonSelected}
            className={`w-full text-left mb-4 rounded-2xl border p-3 transition-colors ${
              ecgAddonSelected ? "border-primary bg-primary/5" : "border-border/70 bg-primary/[0.03]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">Add Home ECG Check</p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    <Star className="w-2 h-2" /> Recommended
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end">
                <p className="text-sm font-bold text-foreground">
                  {ecgAddonPrice > 0 ? `₹ ${ecgAddonPrice}` : "FREE"}
                </p>
                <p className={`text-[10px] font-bold ${ecgAddonSelected ? "text-primary" : "text-primary/80"}`}>
                  {ecgAddonSelected ? "Added" : "Add"}
                </p>
              </div>
            </div>
          </motion.button>
        )}

        {/* Lab Offers */}
        {labOffers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mb-4 space-y-3">
            <h3 className="text-base font-bold text-foreground tracking-tight px-1">Offers for you</h3>
            <div className="flex flex-col gap-3">
              {labOffers.map((offer) => {
                const isApplicable = stateSubtotal >= offer.min_order_amount;
                const isSelected = appliedOffer?.id === offer.id;
                
                let title = "";
                let desc = "";
                if (offer.type === 'free_delivery') {
                  title = `Free delivery on orders above ₹${offer.min_order_amount}`;
                  desc = "Waives platform and home collection fees";
                } else if (offer.type === 'percentage_discount') {
                  title = `${offer.discount_value}% off on orders above ₹${offer.min_order_amount}`;
                  desc = offer.max_discount_cap ? `Up to ₹${offer.max_discount_cap}` : "";
                } else if (offer.type === 'flat_discount') {
                  title = `Flat ₹${offer.discount_value} off on orders above ₹${offer.min_order_amount}`;
                }
                
                return (
                  <div 
                    key={offer.id} 
                    className={`relative rounded-2xl border p-4 transition-colors overflow-hidden ${
                      !isApplicable ? "border-border/50 bg-muted/30 grayscale-[50%] opacity-80" 
                      : isSelected ? "border-primary bg-primary/5" 
                      : "border-border/70 bg-card"
                    }`}
                  >
                    {!isApplicable && <div className="absolute inset-0 bg-background/40 z-0 pointer-events-none" />}
                    <div className="relative z-10 flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        offer.type === 'free_delivery' ? "bg-emerald-500/10" : "bg-primary/10"
                      }`}>
                        {offer.type === 'percentage_discount' ? (
                           <span className="font-bold text-primary">%</span>
                        ) : (
                           <Tag className={`w-5 h-5 ${offer.type === 'free_delivery' ? "text-emerald-600" : "text-primary"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-16">
                        <p className="text-sm font-bold text-foreground">{title}</p>
                        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
                        {!isApplicable && (
                          <p className="text-[10px] font-semibold text-destructive mt-1.5">
                            Add items worth ₹{offer.min_order_amount - stateSubtotal} more to apply
                          </p>
                        )}
                      </div>
                    </div>
                    {isApplicable && (
                      <Button
                        variant={isSelected ? "ghost" : "soft"}
                        size="sm"
                        className={`relative z-10 absolute right-4 top-4 h-8 px-4 font-bold ${
                          isSelected ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "text-primary"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setAppliedOffer(null);
                          } else {
                            setAppliedOffer(offer);
                            setCouponCode("");
                            setCouponApplied(false);
                          }
                        }}
                      >
                        {isSelected ? "Remove" : "Apply"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Offers & Benefits */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border/70 shadow-sm p-4 mb-4">
          <h3 className="text-base font-bold text-foreground mb-3 tracking-tight">Offers &amp; Benefits</h3>
          <div className="rounded-xl bg-success/5 border border-success/20 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-success" />
              </div>
              <Input
                placeholder="Apply Coupon Code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 bg-transparent border-0 shadow-none h-9 text-sm font-medium focus-visible:ring-0"
                disabled={couponApplied}
              />
              <Button variant="softSuccess" size="sm" onClick={applyCoupon} disabled={couponApplied} className="h-9 px-4 font-bold">
                {couponApplied ? "Applied" : "Apply"}
              </Button>
            </div>
            {couponApplied && (
              <Badge variant="softSuccess" className="mt-2 ml-11">
                HEALTH100 applied — ₹100 off
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Bill Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border/70 shadow-sm p-4">
          <h3 className="text-base font-bold text-foreground mb-3 tracking-tight">Bill Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">MRP Total</span>
              <span className="text-foreground font-semibold tabular-nums">₹ {stateSubtotal}.00</span>
            </div>
            {bpAddonActive && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Home BP Check</span>
                <span className="text-foreground font-semibold tabular-nums">
                  {(bpAddonPrice || 0) > 0 ? `₹ ${bpAddonPrice}.00` : "FREE"}
                </span>
              </div>
            )}
            {ecgAddonActive && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Home ECG Check</span>
                <span className="text-foreground font-semibold tabular-nums">
                  {(ecgAddonPrice || 0) > 0 ? `₹ ${ecgAddonPrice}.00` : "FREE"}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Home Collection</span>
              {homeCollectionFee > 0 ? (
                <span className="text-foreground font-semibold tabular-nums">₹ {homeCollectionFee}.00</span>
              ) : (
                <span className="text-success font-bold">FREE</span>
              )}
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{appliedOffer ? "Offer Discount" : "Coupon Discount"}</span>
                <span className="text-success font-bold tabular-nums">- ₹ {discount}.00</span>
              </div>
            )}
            {isFreeDelivery ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Platform Charge <span className="text-xs line-through ml-1">₹{basePlatformFee}</span>
                </span>
                <span className="text-success font-bold tabular-nums">FREE</span>
              </div>
            ) : platformFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Platform Charge <span className="text-xs">({platformFeePercent}%)</span>
                </span>
                <span className="text-foreground font-semibold tabular-nums">₹ {platformFee}.00</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 border border-primary/15 px-3.5 py-3">
              <span className="font-bold text-foreground">Payable Amount</span>
              <span className="font-black text-lg text-primary tabular-nums">₹ {total}.00</span>
            </div>
          </div>
        </motion.div>

        {/* Split Pay Button - Select Mode + Pay Now (Moved from fixed bottom) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.25 }}
          className="mt-4 w-full bg-card rounded-2xl border border-border/70 p-3 shadow-sm mb-4"
        >
          <div className="flex items-center gap-0">
            {/* Left: Select Payment Mode */}
            <button
              onClick={() => navigate("/payment-methods", { state: { selectedMethod: selectedPaymentMethod.id, total } })}
              className="flex items-center gap-2 py-2 pr-4 flex-shrink-0"
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
              variant="hero"
              className="flex-1 h-14 rounded-2xl text-base font-bold gap-3 shadow-md shadow-primary/20"
              onClick={handlePayment}
              disabled={verifyingServiceability || isSubmittingOrder}
            >
              <span className="flex flex-col items-center leading-tight pr-3 border-r border-white/25">
                <span className="text-sm font-bold">₹{total}</span>
                <span className="text-[10px] font-semibold opacity-80 tracking-wide">TOTAL</span>
              </span>
              <span className="text-base font-bold">
                {isSubmittingOrder ? "Placing…" : verifyingServiceability ? "Verifying…" : "Place Order ›"}
              </span>
            </Button>
          </div>
        </motion.div>

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
