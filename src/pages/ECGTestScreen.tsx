import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Activity, MapPin, Calendar, Clock, User, CheckCircle2,
  ChevronRight, AlertTriangle, Search, CreditCard, Building2, Star, Loader2,
  Users, Plus, Heart, CheckCircle, Home, Package, Sparkles, Phone, Beaker, Receipt,
  Tag, ChevronDown, ChevronUp, Wallet, Banknote, Shield, Stethoscope
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { labServesPincode } from "@/hooks/useUserPincode";
import { useFamilyMembers, type FamilyMember } from "@/hooks/useFamilyMembers";
import { useLabSlots } from "@/hooks/useLabSlots";
import AddFamilyMemberDialog from "@/components/AddFamilyMemberDialog";
import { ServiceIntro } from "@/components/services/ServiceIntro";
import { toast } from "sonner";
import { sanitizePincode, sanitizeAge, sanitizePhone } from "@/utils/inputSanitizers";
import { FixedCollectionSlot, FIXED_COLLECTION_SLOTS, isFixedSlotBookable, mapBloodTestScheduleToFixedSlots } from "@/lib/lab-slots";

const confettiColors = [
  "hsl(var(--primary))",
  "hsl(340 82% 52%)",
  "hsl(201 88% 62%)",
  "hsl(142 71% 45%)",
  "hsl(48 96% 53%)",
  "hsl(280 65% 60%)",
];

const ConfettiPiece = ({ index }: { index: number }) => {
  const randomX = Math.random() * 100;
  const randomDelay = Math.random() * 0.8;
  const randomDuration = 1.5 + Math.random() * 1.5;
  const randomRotation = Math.random() * 720 - 360;
  const color = confettiColors[index % confettiColors.length];
  const size = 6 + Math.random() * 8;
  const isCircle = Math.random() > 0.5;

  return (
    <motion.div
      className="absolute top-0 pointer-events-none"
      style={{
        left: `${randomX}%`,
        width: size,
        height: isCircle ? size : size * 2.5,
        borderRadius: isCircle ? "50%" : "2px",
        backgroundColor: color,
      }}
      initial={{ y: -20, opacity: 1, rotate: 0, scale: 0 }}
      animate={{
        y: ["0%", "800%"],
        opacity: [1, 1, 0.8, 0],
        rotate: randomRotation,
        scale: [0, 1.2, 1, 0.6],
        x: [0, (Math.random() - 0.5) * 120],
      }}
      transition={{
        duration: randomDuration,
        delay: 0.3 + randomDelay,
        ease: "easeOut",
      }}
    />
  );
};

type FlowStep =
  | "ADDRESS"
  | "AVAILABILITY"
  | "LAB"
  | "APPOINTMENT"
  | "DETAILS"
  | "PAYMENT"
  | "SUMMARY"
  | "SUCCESS";

interface Address {
  id: string;
  type: string;
  fullAddress: string;
  pincode?: string;
}

interface AppointmentDetails {
  date: string;
  timeSlot: string;
}

interface PatientDetails {
  name: string;
  age: string;
  gender: string;
  mobile: string;
  notes: string;
}

interface EcgLab {
  id: string;
  name: string;
  rating: number | null;
  reviews_count: number | null;
  logo_url: string | null;
  home_ecg_price: number;
  ecg_price?: number | null;
  offers_home_ecg?: boolean | null;
  ecg_available?: boolean | null;
  vendor_id: string | null;
  service_pincodes: string[] | null;
  pincode: string | null;
  is_active: boolean;
}

const DEFAULT_ECG_LABS: EcgLab[] = [
  {
    id: "ecg-default-1",
    name: "BloodLyn Central Diagnostic Lab",
    rating: 4.9,
    reviews_count: 1240,
    logo_url: null,
    home_ecg_price: 499,
    ecg_price: 499,
    offers_home_ecg: true,
    ecg_available: true,
    vendor_id: null,
    service_pincodes: [],
    pincode: null,
    is_active: true,
  },
  {
    id: "ecg-default-2",
    name: "HealthSwift Certified Cardiac Hub",
    rating: 4.8,
    reviews_count: 890,
    logo_url: null,
    home_ecg_price: 599,
    ecg_price: 599,
    offers_home_ecg: true,
    ecg_available: true,
    vendor_id: null,
    service_pincodes: [],
    pincode: null,
    is_active: true,
  },
  {
    id: "ecg-default-3",
    name: "Apollo Diagnostics Partner Lab",
    rating: 4.7,
    reviews_count: 650,
    logo_url: null,
    home_ecg_price: 699,
    ecg_price: 699,
    offers_home_ecg: true,
    ecg_available: true,
    vendor_id: null,
    service_pincodes: [],
    pincode: null,
    is_active: true,
  },
];

const dayOffsetForDate = (date: string): number =>
  date === "Tomorrow" ? 1 : date === "Today" ? 0 : 2;

/** Fixed collection windows; a slot needs >1 hour before it ends. */
const isSlotAvailable = (slot: FixedCollectionSlot, date: string): boolean =>
  isFixedSlotBookable(slot, dayOffsetForDate(date));

const ECGTestScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedLab = location.state?.preselectedLab;
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(true);

  const [step, setStep] = useState<FlowStep>("ADDRESS");
  const [bootLoading, setBootLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [pincode, setPincode] = useState("");
  const [labs, setLabs] = useState<EcgLab[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [selectedLab, setSelectedLab] = useState<EcgLab | null>(null);
  const [appointment, setAppointment] = useState<AppointmentDetails>({ date: "Today", timeSlot: "" });
  const [patient, setPatient] = useState<PatientDetails>({ name: "", age: "", gender: "", mobile: "", notes: "" });
  const [placing, setPlacing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(true);
  const [orderOpen, setOrderOpen] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState({ id: "cod", name: "Pay on Delivery" });

  useEffect(() => {
    const checkMethod = () => {
      const stored = sessionStorage.getItem("bloodlyn-selected-payment");
      if (stored) {
        try {
          setSelectedPaymentMethod(JSON.parse(stored));
          sessionStorage.removeItem("bloodlyn-selected-payment");
        } catch {
          /* ignore malformed stored payment method */
        }
      }
    };
    checkMethod();
    window.addEventListener("focus", checkMethod);
    return () => window.removeEventListener("focus", checkMethod);
  }, []);

  const dateOptions = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const fmtDisplay = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });

    return [
      { id: "Today", value: fmt(today), label: "Today", sub: fmtDisplay(today) },
      { id: "Tomorrow", value: fmt(tomorrow), label: "Tomorrow", sub: fmtDisplay(tomorrow) },
      { id: "DayAfter", value: fmt(dayAfter), label: fmtDisplay(dayAfter), sub: "Scheduled" },
    ];
  }, []);

  const { data: partnerSlots } = useLabSlots(selectedLab?.vendor_id ?? null);

  const getIsoDate = (dateStr: string) => {
    const today = new Date();
    if (dateStr === "Today") return today.toISOString().split("T")[0];
    if (dateStr === "Tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }
    if (dateStr === "DayAfter") {
      const dayAfter = new Date(today);
      dayAfter.setDate(today.getDate() + 2);
      return dayAfter.toISOString().split("T")[0];
    }
    return dateStr || today.toISOString().split("T")[0];
  };

  const timeSlots = useMemo(() => {
    return mapBloodTestScheduleToFixedSlots(
      getIsoDate(appointment.date),
      partnerSlots,
      (selectedLab as any)?.closed_days || ["Sun"]
    );
  }, [appointment.date, partnerSlots, selectedLab]);

  const { members: familyMembers = [] } = useFamilyMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string>("self");

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selfProfile, setSelfProfile] = useState<{ name: string; age: string; gender: string; mobile: string }>({
    name: "", age: "", gender: "", mobile: "",
  });

  useEffect(() => {
    if (!user) {
      setBootLoading(false);
      setStep("ADDRESS");
      return;
    }

    let cancelled = false;
    (async () => {
      const [{ data: addrs }, { data: profile }] = await Promise.all([
        supabase.from("addresses").select("id, type, address_line1, address_line2, city, state, pincode, is_default").eq("user_id", user.id).order("is_default", { ascending: false }),
        supabase.from("profiles").select("full_name, date_of_birth, gender, phone").eq("id", user.id).maybeSingle(),
      ]);

      if (cancelled) return;

      if (addrs && addrs.length > 0) {
        const formatted: Address[] = addrs.map((a: any) => ({
          id: a.id,
          type: a.type || "Home Visit",
          fullAddress: [a.address_line1, a.address_line2, a.city, a.state, a.pincode].filter(Boolean).join(", "),
          pincode: a.pincode,
        }));
        setSavedAddresses(formatted);
      }

      if (profile) {
        const profName = profile.full_name || "";
        const profPhone = profile.phone || "";
        const profAgeStr = profile.date_of_birth
          ? String(Math.max(0, Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000)))
          : "";
        const rawGender = (profile.gender || "").toLowerCase();
        const profGender = rawGender.includes("f") ? "Female" : rawGender.includes("m") ? "Male" : "Other";

        setSelfProfile({ name: profName, age: profAgeStr, gender: profGender, mobile: profPhone });

        setPatient((p) => ({
          ...p,
          name: p.name || profName,
          gender: p.gender || profGender,
          mobile: p.mobile || profPhone,
          age: p.age || profAgeStr,
        }));
      }

      const def = addrs?.[0];
      if (def && def.pincode && /^\d{6}$/.test(def.pincode)) {
        setSelectedAddress({
          id: def.id,
          type: def.type || "Home Visit",
          fullAddress: [def.address_line1, def.address_line2, def.city, def.state, def.pincode].filter(Boolean).join(", "),
          pincode: def.pincode,
        });
        setPincode(def.pincode);
        if (preselectedLab) {
          setSelectedLab(preselectedLab);
          setStep("APPOINTMENT");
        } else {
          setStep("LAB");
        }
      } else {
        setStep("ADDRESS");
      }
      setBootLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch labs offering ECG services whenever we enter the LAB step + subscribe to realtime updates
  useEffect(() => {
    if (step !== "LAB") return;
    let cancelled = false;

    const loadLabs = async () => {
      setLabsLoading(true);
      try {
        const { data, error } = await supabase
          .from("diagnostic_centers")
          .select("*")
          .order("rating", { ascending: false });

        if (cancelled) return;

        let dbLabs: EcgLab[] = [];
        if (data && !error && data.length > 0) {
          dbLabs = data
            .filter((l: any) => l.is_active !== false && l.offers_home_ecg !== false && l.ecg_available !== false)
            .map((l: any) => ({
              ...l,
              home_ecg_price: l.home_ecg_price || l.ecg_price || 599,
            }));
        }

        let matchingDb = dbLabs;
        if (pincode && dbLabs.length > 0) {
          const matched = dbLabs.filter((l: any) => labServesPincode(l, pincode));
          if (matched.length > 0) {
            matchingDb = matched;
          }
        }

        // Only show live database labs from Supabase
        setLabs(matchingDb);
      } catch (err) {
        console.warn("Error loading ECG labs:", err);
        setLabs([]);
      } finally {
        if (!cancelled) setLabsLoading(false);
      }
    };

    loadLabs();

    // Subscribe to realtime database changes on diagnostic_centers
    const channel = supabase
      .channel("ecg_labs_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "diagnostic_centers" }, () => loadLabs())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [step, pincode]);



  const handleBack = () => {
    switch (step) {
      case "ADDRESS": navigate(-1); break;
      case "AVAILABILITY": setStep(selectedAddress ? "LAB" : "ADDRESS"); break;
      case "LAB": setStep("ADDRESS"); break;
      case "APPOINTMENT": setStep("LAB"); break;
      case "DETAILS": setStep("APPOINTMENT"); break;
      case "PAYMENT": setStep("DETAILS"); break;
      case "SUMMARY": setStep("DETAILS"); break;
      case "SUCCESS": navigate("/"); break;
    }
  };

  const checkAvailability = async () => {
    if (pincode.length < 6) return;
    if (selectedAddress?.id === "manual") {
      setSelectedAddress({
        ...selectedAddress,
        fullAddress: `Home ECG Visit — Pincode: ${pincode}`,
        pincode: pincode,
      });
    }
    if (preselectedLab) {
      setSelectedLab(preselectedLab);
      setStep("APPOINTMENT");
    } else {
      setStep("LAB");
    }
  };

  const progressToPayment = () => {
    if (patient.name && patient.age && patient.gender && patient.mobile.length === 10) {
      setStep("PAYMENT");
    } else {
      toast.error("Please fill in all required patient details correctly");
    }
  };

  const rawPrice = selectedLab?.home_ecg_price ?? 599;
  const discount = couponApplied ? 100 : 0;
  const price = Math.max(0, rawPrice - discount);

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "HEALTH100" || code === "ECG100") {
      setCouponApplied(true);
      toast.success("Coupon applied! ₹100 off");
    } else {
      toast.error("Invalid coupon code. Try ECG100");
    }
  };

  const handlePlaceOrder = async () => {
    if (placing) return;
    if (!user) {
      toast.error("Please log in to place your ECG booking.");
      navigate("/login");
      return;
    }
    if (!selectedLab) {
      toast.error("Please select a diagnostic lab for your ECG test.");
      setStep("LAB");
      return;
    }

    setPlacing(true);
    try {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const safeLabId = (selectedLab.id && UUID_RE.test(selectedLab.id)) ? selectedLab.id : null;
      const safeVendorId = (selectedLab.vendor_id && UUID_RE.test(selectedLab.vendor_id)) ? selectedLab.vendor_id : null;

      let validAddressId: string | null = (selectedAddress?.id && UUID_RE.test(selectedAddress.id)) ? selectedAddress.id : null;
      if (!validAddressId && user) {
        const visitPincode = pincode || selectedAddress?.pincode || "000000";
        const visitAddressLine = selectedAddress?.fullAddress && selectedAddress.fullAddress !== "Manual Visit Location"
          ? selectedAddress.fullAddress
          : `Home ECG Visit Location (Pincode: ${visitPincode})`;

        try {
          const { data: newAddr } = await supabase
            .from("addresses")
            .insert({
              user_id: user.id,
              type: "Home Visit",
              address_line1: visitAddressLine,
              city: "City",
              state: "State",
              pincode: visitPincode,
              is_default: false,
            })
            .select()
            .single();
          if (newAddr?.id) {
            validAddressId = newAddr.id;
            setSelectedAddress({
              id: newAddr.id,
              type: newAddr.type || "Home Visit",
              fullAddress: newAddr.address_line1,
              pincode: newAddr.pincode,
            });
          }
        } catch (addrErr) {
          console.warn("Could not create fallback address record:", addrErr);
        }
      }

      const cartItems = [{
        id: `ecg-${selectedLab.id}`,
        name: `12-Lead ECG Test — ${selectedLab.name}`,
        price: rawPrice,
        quantity: 1,
        labId: safeLabId || undefined,
        labName: selectedLab.name,
        vendorId: safeVendorId || undefined,
        category: "ECG Test",
      }];

      const cleanPhone = patient.mobile.replace(/\D/g, "").slice(-10);
      const validPhone = /^\d{10}$/.test(cleanPhone) ? cleanPhone : null;
      const parsedAge = parseInt(String(patient.age), 10);
      const validAge = !isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 120 ? parsedAge : null;

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          cartItems,
          addressId: validAddressId || null,
          scheduledDate: getIsoDate(appointment.date),
          scheduledTimeSlot: appointment.timeSlot || FIXED_COLLECTION_SLOTS[0].display,
          subtotal: rawPrice,
          discount,
          total: price,
          paymentMethod: selectedPaymentMethod.id || "cod",
          couponCode: couponApplied ? "ECG100" : null,
          patientName: patient.name || "Patient",
          patientAge: validAge,
          patientGender: patient.gender || "Other",
          patientPhone: validPhone,
          labId: safeLabId || null,
          labName: selectedLab.name,
          vendorId: safeVendorId || null,
          order_type: "ecg_check",
          service_type: "ecg_check",
        },
        headers: {
          "Idempotency-Key": `ecg-${user.id}-${selectedLab.id}-${Date.now()}`,
        },
      });

      if (error || !data?.orderId || data?.error) {
        console.error("ECG order error details:", error, data);
        const errMsg = data?.error || error?.message || "Couldn't place your booking. Please try again.";
        toast.error(errMsg);
        setPlacing(false);
        return;
      }

      setOrderNumber(data.orderNumber || data.orderId);
      setShowConfetti(true);
      setStep("SUCCESS");
    } catch (e: any) {
      console.error("ECG order exception:", e);
      toast.error(e?.message || "Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const stepIndex = useMemo(() => {
    const order: FlowStep[] = ["LAB", "APPOINTMENT", "DETAILS", "PAYMENT"];
    const i = order.indexOf(step);
    return i < 0 ? 0 : i;
  }, [step]);
  const totalSteps = 4;

  if (showIntro) {
    return <ServiceIntro serviceType="ecg" onProceed={() => setShowIntro(false)} />;
  }

  return (
    <MobileLayout showNav={false}>
      {step !== "SUCCESS" && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40 pb-2">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-[17px] font-black text-foreground tracking-tight flex items-center gap-2">
                At-Home ECG Test
                <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">Visit</span>
              </h1>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                {step === "ADDRESS" && "Select Visit Address"}
                {step === "AVAILABILITY" && "Confirm Pincode"}
                {step === "LAB" && "Choose Diagnostic Center"}
                {step === "APPOINTMENT" && "Choose Date & Time Slot"}
                {step === "DETAILS" && "Patient Information"}
                {step === "PAYMENT" && "Payment & Review"}
              </p>
            </div>
          </div>
          <div className="px-4 mt-2">
            <div className="flex gap-1 h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className="bg-rose-600 h-full rounded-full"
                initial={{ width: "25%" }}
                animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-hidden relative min-h-[calc(100vh-100px)]">
        {bootLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
            <p className="text-xs text-muted-foreground font-semibold">Loading ECG details…</p>
          </div>
        )}
        {!bootLoading && (
          <AnimatePresence mode="wait">
            {step === "ADDRESS" && (
              <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
                <h2 className="text-xl font-black mb-4">Where should our technician visit?</h2>

                {savedAddresses.length === 0 ? (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center">
                    <MapPin className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-rose-900 mb-1">No saved addresses</p>
                    <p className="text-xs text-rose-700/70 mb-4">Add an address or enter your visit pincode manually.</p>
                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                      <button
                        onClick={() => navigate("/saved-addresses")}
                        className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-rose-700 transition-colors"
                      >
                        Add New Address
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAddress({
                            id: "manual",
                            type: "ECG Visit",
                            fullAddress: "Manual Visit Location",
                            pincode: "",
                          });
                          setStep("AVAILABILITY");
                        }}
                        className="bg-white border border-rose-200 text-rose-600 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-rose-50 transition-colors"
                      >
                        Enter Pincode Manually
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Saved Addresses</p>
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddress(addr);
                            if (addr.pincode) setPincode(addr.pincode);
                            setStep("AVAILABILITY");
                          }}
                          className="w-full bg-card border border-border/50 rounded-2xl p-4 flex gap-3 items-start shadow-sm active:scale-[0.98] transition-transform text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4 text-foreground/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-black text-foreground mb-1">{addr.type}</span>
                            <span className="block text-xs font-medium text-muted-foreground leading-relaxed">{addr.fullAddress}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {step === "AVAILABILITY" && (
              <motion.div key="availability" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-center mb-2">Confirm Pincode</h2>
                <p className="text-sm text-center text-muted-foreground font-medium mb-8 max-w-[280px]">
                  We'll show diagnostic centers offering 12-Lead ECG Tests in your area.
                </p>
                <div className="w-full max-w-sm space-y-4">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit pincode"
                    value={pincode}
                    onChange={(e) => setPincode(sanitizePincode(e.target.value))}
                    className="h-14 text-center text-lg font-bold tracking-widest bg-muted/50 rounded-2xl"
                  />
                  <button
                    onClick={checkAvailability}
                    disabled={pincode.length < 6}
                    className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-rose-600/20 disabled:opacity-50"
                  >
                    Find Diagnostic Labs
                  </button>
                </div>
              </motion.div>
            )}

            {step === "LAB" && (
              <motion.div key="lab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-foreground">Select Diagnostic Lab</h2>
                    <p className="text-xs font-semibold text-muted-foreground">Certified 12-lead ECG technicians & digital reports</p>
                  </div>
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                    Pincode: {pincode}
                  </Badge>
                </div>

                {labsLoading ? (
                  <div className="space-y-3 py-6">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-32 bg-muted/40 rounded-3xl animate-pulse" />
                    ))}
                  </div>
                ) : labs.length === 0 ? (
                  <div className="bg-muted/30 border border-border/60 rounded-3xl p-8 text-center space-y-3">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                    <p className="text-sm font-bold text-foreground">No Labs Found for Pincode {pincode}</p>
                    <p className="text-xs text-muted-foreground">Try changing your location or pincode to check nearby diagnostic partners.</p>
                    <Button variant="outline" size="sm" onClick={() => setStep("ADDRESS")} className="rounded-xl">
                      Change Location
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {labs.map((lab) => (
                      <button
                        key={lab.id}
                        onClick={() => {
                          setSelectedLab(lab);
                          setStep("APPOINTMENT");
                        }}
                        className={`w-full bg-card border rounded-3xl p-5 text-left transition-all relative overflow-hidden active:scale-[0.98] ${
                          selectedLab?.id === lab.id
                            ? "border-rose-500 bg-rose-50/10 shadow-lg shadow-rose-500/10"
                            : "border-border/60 hover:border-rose-500/40 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-black text-lg shrink-0">
                              <Activity className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-foreground tracking-tight">{lab.name}</h3>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  {lab.rating || 4.8}
                                </span>
                                <span className="text-muted-foreground text-[11px]">NABL Accredited Lab</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-black text-emerald-600">₹{lab.home_ecg_price}</span>
                            <span className="block text-[10px] font-bold text-muted-foreground">All Inclusive</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === "APPOINTMENT" && (
              <motion.div key="appointment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-foreground">Choose Date & Time Slot</h2>
                  <p className="text-xs font-semibold text-muted-foreground">Select when our technician should arrive for the ECG test</p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">Select Date</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {dateOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setAppointment((a) => ({ ...a, date: opt.id }))}
                        className={`p-3.5 rounded-2xl border text-center transition-all ${
                          appointment.date === opt.id
                            ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                            : "bg-card border-border/60 text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="block text-xs font-black">{opt.label}</span>
                        <span className={`block text-[10px] mt-0.5 font-medium ${appointment.date === opt.id ? "text-rose-100" : "text-muted-foreground"}`}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">Select Time Slot</span>
                  <div className="space-y-2.5">
                    {timeSlots.map((slot) => {
                      const avail = isSlotAvailable(slot, appointment.date);
                      const isSelected = appointment.timeSlot === slot.display;
                      return (
                        <button
                          key={slot.id}
                          disabled={!avail}
                          onClick={() => setAppointment((a) => ({ ...a, timeSlot: slot.display }))}
                          className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                            !avail
                              ? "opacity-40 bg-muted/20 border-border cursor-not-allowed"
                              : isSelected
                              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-700 dark:text-rose-300 font-bold"
                              : "bg-card border-border/60 hover:border-rose-500/40 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-rose-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="block text-xs font-bold">{slot.label} ({slot.time})</span>
                              <span className="block text-[10px] font-medium text-muted-foreground">
                                {avail ? slot.note : "Too late — needs 1 hour lead time"}
                              </span>
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-rose-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  disabled={!appointment.timeSlot}
                  onClick={() => setStep("DETAILS")}
                  className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/20"
                >
                  Continue to Patient Details
                </Button>
              </motion.div>
            )}

            {step === "DETAILS" && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-foreground">Patient Information</h2>
                  <p className="text-xs font-semibold text-muted-foreground">Who is taking the At-Home 12-Lead ECG Test?</p>
                </div>

                {/* Family member quick selection */}
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">Select Patient</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => {
                        setSelectedMemberId("self");
                        setPatient({
                          name: selfProfile.name,
                          age: selfProfile.age,
                          gender: selfProfile.gender,
                          mobile: selfProfile.mobile,
                          notes: "",
                        });
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        selectedMemberId === "self"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Myself ({selfProfile.name || "Self"})
                    </button>
                    {(familyMembers || []).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setPatient({
                            name: m.fullName || "",
                            age: String(m.age || ""),
                            gender: m.gender || "Male",
                            mobile: m.phone || selfProfile.mobile || "",
                            notes: "",
                          });
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                          selectedMemberId === m.id
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {m.fullName} ({m.relationship || "Family"})
                      </button>
                    ))}

                    <button
                      onClick={() => setAddMemberOpen(true)}
                      className="px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 border border-dashed border-rose-300 text-rose-600 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Member
                    </button>
                  </div>
                </div>

                <div className="space-y-4 bg-card border border-border/60 p-5 rounded-3xl shadow-xs">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Full Name</label>
                    <Input
                      value={patient.name}
                      onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Enter patient full name"
                      className="h-11 rounded-xl bg-muted/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Age (Years)</label>
                      <Input
                        type="number"
                        value={patient.age}
                        onChange={(e) => setPatient((p) => ({ ...p, age: sanitizeAge(e.target.value) }))}
                        placeholder="Age"
                        className="h-11 rounded-xl bg-muted/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Gender</label>
                      <select
                        value={patient.gender}
                        onChange={(e) => setPatient((p) => ({ ...p, gender: e.target.value }))}
                        className="w-full h-11 rounded-xl bg-muted/30 border border-input px-3 text-xs font-bold"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Mobile Number</label>
                    <Input
                      type="tel"
                      maxLength={10}
                      value={patient.mobile}
                      onChange={(e) => setPatient((p) => ({ ...p, mobile: sanitizePhone(e.target.value) }))}
                      placeholder="10-digit mobile number"
                      className="h-11 rounded-xl bg-muted/30 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Special Symptoms / Instructions (Optional)</label>
                    <Textarea
                      value={patient.notes}
                      onChange={(e) => setPatient((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Chest discomfort, routine cardiac check, etc."
                      className="rounded-xl bg-muted/30 text-xs min-h-[70px]"
                    />
                  </div>
                </div>

                <Button
                  onClick={progressToPayment}
                  className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/20"
                >
                  Proceed to Payment & Review
                </Button>
              </motion.div>
            )}

            {step === "PAYMENT" && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-foreground">Review & Payment</h2>
                  <p className="text-xs font-semibold text-muted-foreground">Complete your booking for At-Home 12-Lead ECG Test</p>
                </div>

                {/* Booking Summary Card */}
                <div className="bg-card border border-border/60 p-5 rounded-3xl space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-foreground">{selectedLab?.name}</h3>
                        <p className="text-[11px] text-muted-foreground font-semibold">12-Lead ECG Test At Home</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                      Certified Lab
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">Patient</span>
                      <span className="font-bold text-foreground">{patient.name} ({patient.age}y, {patient.gender})</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">Scheduled Slot</span>
                      <span className="font-bold text-foreground">{appointment.date} • {appointment.timeSlot.split(" ")[0]}</span>
                    </div>
                  </div>

                  <div className="text-xs border-t border-border/40 pt-3">
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Visit Location</span>
                    <span className="text-muted-foreground font-medium">{selectedAddress?.fullAddress}</span>
                  </div>
                </div>

                {/* Coupon Code Section */}
                <div className="bg-card border border-border/60 p-4 rounded-2xl flex gap-2 items-center">
                  <Tag className="w-4 h-4 text-rose-500 shrink-0" />
                  <Input
                    placeholder="Enter coupon code (e.g. ECG100)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="h-9 text-xs bg-muted/30 border-0 uppercase font-bold"
                  />
                  <Button size="sm" onClick={applyCoupon} className="h-9 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
                    Apply
                  </Button>
                </div>

                {/* Price Breakdown */}
                <div className="bg-card border border-border/60 p-5 rounded-3xl space-y-2.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>12-Lead ECG Test Fee</span>
                    <span>₹{rawPrice}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Coupon Discount</span>
                      <span>-₹100</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-foreground pt-2 border-t border-border/40">
                    <span>Total Payable</span>
                    <span className="text-emerald-600">₹{price}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:opacity-95 text-white font-bold shadow-lg shadow-rose-600/25"
                >
                  {placing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  {placing ? "Placing Booking..." : `Confirm ECG Booking • ₹${price}`}
                </Button>
              </motion.div>
            )}

            {step === "SUCCESS" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 text-center space-y-6 min-h-[70vh] flex flex-col justify-center items-center relative">
                {showConfetti && Array.from({ length: 40 }).map((_, i) => <ConfettiPiece key={i} index={i} />)}

                <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shadow-xl shadow-rose-500/20">
                  <Activity className="w-10 h-10 animate-bounce" />
                </div>

                <div>
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold px-3 py-1 mb-2">
                    Booking Confirmed 🎉
                  </Badge>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">At-Home ECG Test Booked!</h2>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">
                    Booking ID: <span className="font-bold text-foreground">{orderNumber || "ECG-CONFIRMED"}</span>
                  </p>
                </div>

                <div className="bg-card border border-border/60 rounded-3xl p-5 w-full max-w-sm text-left space-y-3 shadow-sm text-xs">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="font-bold text-foreground">{selectedLab?.name}</span>
                    <span className="font-black text-emerald-600">₹{price}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">Patient</span>
                    <span className="font-bold text-foreground">{patient.name}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">Scheduled Visit</span>
                    <span className="font-bold text-foreground">{appointment.date} • {appointment.timeSlot}</span>
                  </div>
                </div>

                <div className="flex flex-col w-full max-w-sm gap-3">
                  <Button onClick={() => navigate("/bookings")} className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/20">
                    View My Bookings
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")} className="h-12 rounded-2xl font-bold">
                    Return to Home
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <AddFamilyMemberDialog open={addMemberOpen} onOpenChange={setAddMemberOpen} onAdd={() => setAddMemberOpen(false)} />
    </MobileLayout>
  );
};

export default ECGTestScreen;
