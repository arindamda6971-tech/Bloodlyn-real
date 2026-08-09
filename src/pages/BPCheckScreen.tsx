import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, HeartPulse, MapPin, Calendar, Clock, User, CheckCircle2,
  ChevronRight, AlertTriangle, Search, CreditCard, Building2, Star, Loader2,
  Users, Plus, Heart, CheckCircle, Home, Package, Sparkles, Phone, Beaker, Receipt,
  Tag, ChevronDown, ChevronUp, Wallet, Banknote,
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
import AddFamilyMemberDialog from "@/components/AddFamilyMemberDialog";
import { ServiceIntro } from "@/components/services/ServiceIntro";
import { toast } from "sonner";
import { sanitizePincode, sanitizeAge, sanitizePhone } from "@/utils/inputSanitizers";
import { FIXED_COLLECTION_SLOTS, isFixedSlotBookable, isLabOpenOnDayOffset, type FixedCollectionSlot } from "@/lib/lab-slots";
import { useLabSlots } from "@/hooks/useLabSlots";

const confettiColors = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
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

interface BpLab {
  id: string;
  name: string;
  rating: number | null;
  reviews_count: number | null;
  logo_url: string | null;
  home_bp_price: number;
  vendor_id: string | null;
  service_pincodes: string[] | null;
  pincode: string | null;
  is_active: boolean;
}

const DEFAULT_BP_LABS: BpLab[] = [
  {
    id: "bp-default-1",
    name: "BloodLyn Home Healthcare Center",
    rating: 4.9,
    reviews_count: 1420,
    logo_url: null,
    home_bp_price: 199,
    vendor_id: null,
    service_pincodes: [],
    pincode: null,
    is_active: true,
  },
  {
    id: "bp-default-2",
    name: "HealthSwift Vital Check Hub",
    rating: 4.8,
    reviews_count: 980,
    logo_url: null,
    home_bp_price: 249,
    vendor_id: null,
    service_pincodes: [],
    pincode: null,
    is_active: true,
  },
  {
    id: "bp-default-3",
    name: "Thyrocare Partner Care Center",
    rating: 4.7,
    reviews_count: 730,
    logo_url: null,
    home_bp_price: 299,
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

const BPCheckScreen = () => {
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
  const [labs, setLabs] = useState<BpLab[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [selectedLab, setSelectedLab] = useState<BpLab | null>(null);
  const [appointment, setAppointment] = useState<AppointmentDetails>({ date: "Today", timeSlot: "" });

  // BP / ECG bookings reuse the exact same lab schedule published for blood-test
  // collection (Partner dashboard `lab_time_slots`) — single source of truth.
  const { data: labSchedule } = useLabSlots(selectedLab?.vendor_id ?? null);
  const isLabClosedOnDate = !isLabOpenOnDayOffset(
    labSchedule?.byDay,
    labSchedule?.hasSchedule ?? true,
    dayOffsetForDate(appointment.date)
  );

  const dateOptions = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
    const fmtDisplay = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });
    return [
      { id: "Today", label: "Today", sub: fmtDisplay(today) },
      { id: "Tomorrow", label: "Tomorrow", sub: fmtDisplay(tomorrow) },
      { id: "DayAfter", label: fmtDisplay(dayAfter), sub: "Scheduled" },
    ];
  }, []);

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
        } catch (e) {
          console.error("Failed to parse payment method", e);
        }
      }
    };
    checkMethod();
    window.addEventListener("focus", checkMethod);
    return () => window.removeEventListener("focus", checkMethod);
  }, []);

  const { members: familyMembers, addMember } = useFamilyMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string | "self">("self");
  const [showAddFamilyDialog, setShowAddFamilyDialog] = useState(false);
  const [selfProfile, setSelfProfile] = useState<{ name: string; age: string; gender: string; mobile: string } | null>(null);

  const handleAddFamilyMember = async (memberData: Omit<FamilyMember, "id">) => {
    const newMember = await addMember(memberData);
    if (newMember) {
      setSelectedMemberId(newMember.id);
      setPatient((p) => ({
        ...p,
        name: newMember.fullName,
        age: newMember.age,
        gender: newMember.gender,
        mobile: newMember.phone || p.mobile,
      }));
    }
  };

  // Boot: load default address + profile, auto-skip to LAB when we have an address
  useEffect(() => {
    if (!user) { setBootLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [{ data: addrData, error: addrErr }, { data: profData }] = await Promise.all([
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("full_name, phone, gender, date_of_birth")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      let rawAddrs = addrData || [];
      if (addrErr || rawAddrs.length === 0) {
        try {
          const fallback = localStorage.getItem("addresses_fallback") || localStorage.getItem("user_addresses");
          if (fallback) {
            const parsed = JSON.parse(fallback);
            if (Array.isArray(parsed)) rawAddrs = parsed;
          }
        } catch (e) {
          console.error("Failed to parse local addresses", e);
        }
      }

      const addrs: Address[] = rawAddrs.map((a: any) => ({
        id: a.id || String(Math.random()),
        type: a.type || "Home",
        fullAddress: [a.address_line1 || a.address_line, a.address_line2, a.city, a.state, a.pincode].filter(Boolean).join(", "),
        pincode: a.pincode || "",
      }));
      setSavedAddresses(addrs);

      // Prefill patient from profile
      if (profData) {
        const dob = profData.date_of_birth ? new Date(profData.date_of_birth) : null;
        const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
        const profName = profData.full_name || "";
        const profGender = profData.gender ? profData.gender.charAt(0).toUpperCase() + profData.gender.slice(1) : "";
        const profPhone = (profData.phone || "").replace(/\D/g, "").slice(-10);
        const profAgeStr = age && age > 0 ? String(age) : "";

        setSelfProfile({ name: profName, age: profAgeStr, gender: profGender, mobile: profPhone });

        setPatient((p) => ({
          ...p,
          name: p.name || profName,
          gender: p.gender || profGender,
          mobile: p.mobile || profPhone,
          age: p.age || profAgeStr,
        }));
      }

      // Auto-select default address + jump to LAB
      const def = addrs[0];
      if (def && def.pincode && /^\d{6}$/.test(def.pincode)) {
        setSelectedAddress(def);
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

  // Fetch labs whenever we enter the LAB step + subscribe to realtime updates
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

        let dbLabs: BpLab[] = [];
        if (data && !error && data.length > 0) {
          dbLabs = data
            .filter((l: any) => l.is_active !== false && l.offers_home_bp !== false)
            .map((l: any) => ({
              ...l,
              home_bp_price: l.home_bp_price || 249,
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
        console.warn("Error loading BP labs:", err);
        setLabs([]);
      } finally {
        if (!cancelled) setLabsLoading(false);
      }
    };

    loadLabs();

    // Subscribe to realtime database changes on diagnostic_centers
    const channel = supabase
      .channel("bp_labs_realtime")
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
        fullAddress: `Home BP Visit — Pincode: ${pincode}`,
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

  const rawPrice = selectedLab?.home_bp_price ?? 299;
  const discount = couponApplied ? 100 : 0;
  const price = Math.max(0, rawPrice - discount);

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "HEALTH100" || code === "BP100") {
      setCouponApplied(true);
      toast.success("Coupon applied! ₹100 off");
    } else {
      toast.error("Invalid coupon code. Try HEALTH100");
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please sign in to book");
      navigate("/login");
      return;
    }
    if (!selectedLab) {
      toast.error("Please select a lab");
      setStep("LAB");
      return;
    }
    setPlacing(true);
    try {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const safeLabId = (selectedLab.id && UUID_RE.test(selectedLab.id)) ? selectedLab.id : null;
      const safeVendorId = (selectedLab.vendor_id && UUID_RE.test(selectedLab.vendor_id)) ? selectedLab.vendor_id : null;

      let validAddressId = (selectedAddress?.id && UUID_RE.test(selectedAddress.id)) ? selectedAddress.id : null;
      if (!validAddressId && user) {
        const visitPincode = pincode || selectedAddress?.pincode || "000000";
        const visitAddressLine = selectedAddress?.fullAddress && selectedAddress.fullAddress !== "Manual Visit Location"
          ? selectedAddress.fullAddress
          : `Home BP Visit Location (Pincode: ${visitPincode})`;

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
        id: `bp-${selectedLab.id}`,
        name: `Home BP Check — ${selectedLab.name}`,
        price: rawPrice,
        quantity: 1,
        labId: safeLabId || selectedLab.id,
        labName: selectedLab.name,
        vendorId: safeVendorId || undefined,
        category: "BP Check",
      }];

      const cleanPhone = patient.mobile.replace(/\D/g, "").slice(-10);
      const validPhone = /^\d{10}$/.test(cleanPhone) ? cleanPhone : null;
      const parsedAge = parseInt(String(patient.age), 10);
      const validAge = !isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 120 ? parsedAge : null;

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          cartItems,
          addressId: validAddressId,
          scheduledDate: getIsoDate(appointment.date),
          scheduledTimeSlot: appointment.timeSlot || FIXED_COLLECTION_SLOTS[0].display,
          subtotal: rawPrice,
          discount,
          total: price,
          paymentMethod: selectedPaymentMethod.id,
          couponCode: couponApplied ? "HEALTH100" : null,
          patientName: patient.name || "Patient",
          patientAge: validAge,
          patientGender: patient.gender || "Other",
          patientPhone: validPhone,
          labId: safeLabId || selectedLab.id,
          labName: selectedLab.name,
          vendorId: safeVendorId || null,
        },
        headers: {
          "Idempotency-Key": `bp-${user.id}-${selectedLab.id}-${Date.now()}`,
        },
      });

      if (error || !data?.orderId || data?.error) {
        console.error("BP order error:", error, data);
        const errMsg = data?.error || error?.message || "Couldn't place your booking. Please try again.";
        toast.error(errMsg);
        setPlacing(false);
        return;
      }

      setOrderNumber(data.orderNumber || data.orderId);
      setShowConfetti(true);
      setStep("SUCCESS");
    } catch (e: any) {
      console.error("BP booking exception:", e);
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
    return <ServiceIntro serviceType="bp" onProceed={() => setShowIntro(false)} />;
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
                Home BP Check
                <span className="bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">Visit</span>
              </h1>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                {step === "ADDRESS" && "Select Visit Address"}
                {step === "AVAILABILITY" && "Confirm Pincode"}
                {step === "LAB" && "Choose Diagnostic Lab"}
                {step === "APPOINTMENT" && "Choose Date & Time"}
                {step === "DETAILS" && "Patient Information"}
                {step === "SUMMARY" && "Review Booking"}
              </p>
            </div>
          </div>
          <div className="px-4 mt-2">
            <div className="flex gap-1 h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className="bg-blue-600 h-full rounded-full"
                initial={{ width: "16%" }}
                animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-hidden relative min-h-[calc(100vh-100px)]">
        {bootLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-xs text-muted-foreground font-semibold">Loading your details…</p>
          </div>
        )}
        {!bootLoading && (
        <AnimatePresence mode="wait">

          {step === "ADDRESS" && (
            <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
              <h2 className="text-xl font-black mb-4">Where should we visit?</h2>

              {savedAddresses.length === 0 ? (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
                  <MapPin className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-blue-900 mb-1">No saved addresses</p>
                  <p className="text-xs text-blue-700/70 mb-4">Add an address or enter your visit pincode manually.</p>
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button
                      onClick={() => navigate("/saved-addresses")}
                      className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      Add New Address
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAddress({
                          id: "manual",
                          type: "Home Visit",
                          fullAddress: "Manual Visit Location",
                          pincode: "",
                        });
                        setStep("AVAILABILITY");
                      }}
                      className="bg-white border border-blue-200 text-blue-600 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-50 transition-colors"
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
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black text-center mb-2">Confirm Pincode</h2>
              <p className="text-sm text-center text-muted-foreground font-medium mb-8 max-w-[280px]">
                We'll show only labs that actually offer Home BP Check in your pincode.
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
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Find Labs
                </button>
              </div>
            </motion.div>
          )}

          {step === "LAB" && (
            <motion.div key="lab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
              <h2 className="text-xl font-black mb-1">Pick a lab</h2>
              <p className="text-xs text-muted-foreground font-medium mb-3">
                Only labs offering Home BP Check for pincode <span className="font-bold text-foreground">{pincode}</span>
              </p>

              {selectedAddress && (
                <div className="mb-5 bg-blue-50/60 border border-blue-100 rounded-2xl p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-blue-700/80">Visit at</p>
                    <p className="text-xs font-bold text-foreground leading-snug truncate">{selectedAddress.fullAddress}</p>
                  </div>
                  <button
                    onClick={() => setStep("ADDRESS")}
                    className="text-[11px] font-black text-blue-600 uppercase tracking-wider px-2 py-1 rounded-lg active:bg-blue-100 shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {labsLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-xs text-muted-foreground font-semibold">Finding available labs…</p>
                </div>
              ) : labs.length === 0 ? (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-rose-900">No labs available</p>
                    <p className="text-xs font-medium text-rose-700/80 mt-1">
                      No partner lab is currently offering Home BP Check in your pincode. We're expanding fast — please try again soon.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {labs.map((lab) => {
                    const isSelected = selectedLab?.id === lab.id;
                    return (
                      <button
                        key={lab.id}
                        onClick={() => setSelectedLab(lab)}
                        className={`w-full text-left rounded-2xl p-4 border transition-all shadow-sm active:scale-[0.98] flex gap-3 items-center ${
                          isSelected ? "bg-blue-50 border-blue-500" : "bg-card border-border/50"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {lab.logo_url ? (
                            <img src={lab.logo_url} alt={lab.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-foreground truncate">{lab.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {lab.rating != null && (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {Number(lab.rating).toFixed(1)}
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              Home visit
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fee</p>
                          <p className="text-base font-black text-blue-600">₹{lab.home_bp_price}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={() => setStep("APPOINTMENT")}
                  disabled={!selectedLab}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === "APPOINTMENT" && (
            <motion.div key="appointment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
              <h2 className="text-xl font-black mb-6">When should we visit?</h2>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Select Date</p>
              <div className="grid grid-cols-3 gap-2.5 mb-8">
                {dateOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setAppointment({ ...appointment, date: opt.id })}
                    className={`p-3.5 rounded-2xl border text-center transition-all ${
                      appointment.date === opt.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                        : "bg-card border-border/50 text-foreground"
                    }`}
                  >
                    <span className="block text-xs font-black">{opt.label}</span>
                    <span className={`block text-[10px] mt-0.5 font-medium ${appointment.date === opt.id ? "text-blue-100" : "text-muted-foreground"}`}>{opt.sub}</span>
                  </button>
                ))}
              </div>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Select Time Slot</p>
              <div className="space-y-3">
                {FIXED_COLLECTION_SLOTS.map((slot) => {
                  const isAvailable = !isLabClosedOnDate && isSlotAvailable(slot, appointment.date);
                  const isSelected = appointment.timeSlot === slot.display && isAvailable;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => isAvailable && setAppointment({ ...appointment, timeSlot: slot.display })}
                      disabled={!isAvailable}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left ${
                        !isAvailable
                          ? "bg-muted/30 border-transparent opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-card border-slate-200/80 hover:border-primary/40 shadow-xs cursor-pointer"
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          !isAvailable
                            ? "bg-muted/50 text-foreground/30"
                            : isSelected
                            ? "bg-primary text-white"
                            : "bg-slate-100/90 text-slate-600"
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-start flex-1 text-left">
                        <span
                          className={`text-[15px] font-bold ${
                            !isAvailable ? "text-foreground/50 line-through" : isSelected ? "text-primary" : "text-slate-800"
                          }`}
                        >
                          {slot.label} ({slot.time})
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                          {isAvailable ? slot.note : isLabClosedOnDate ? "Center closed on this day" : "Too late — needs 1 hour lead time"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-10">
                <button
                  onClick={() => setStep("DETAILS")}
                  disabled={!appointment.timeSlot}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Continue to Patient Details
                </button>
              </div>
            </motion.div>
          )}

          {step === "DETAILS" && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
              <h2 className="text-xl font-black mb-4">Patient Information</h2>

              {/* Family Member Selection */}
              <div className="mb-6 bg-muted/30 border border-border/40 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-3 px-0.5">
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" /> Who is this BP check for?
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddFamilyDialog(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 active:bg-blue-100 px-2.5 py-1 rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Member
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {/* Self Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberId("self");
                      if (selfProfile) {
                        setPatient((p) => ({
                          ...p,
                          name: selfProfile.name,
                          age: selfProfile.age,
                          gender: selfProfile.gender,
                          mobile: selfProfile.mobile,
                        }));
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-1.5 ${
                      selectedMemberId === "self"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20"
                        : "bg-card border-border/50 text-foreground hover:border-blue-300"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Self {selfProfile?.name ? `(${selfProfile.name})` : ""}</span>
                  </button>

                  {/* Family Members List */}
                  {familyMembers.map((m) => {
                    const isSelected = selectedMemberId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setPatient((p) => ({
                            ...p,
                            name: m.fullName,
                            age: m.age,
                            gender: m.gender,
                            mobile: m.phone || p.mobile,
                          }));
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20"
                            : "bg-card border-border/50 text-foreground hover:border-blue-300"
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                        <span>{m.relationship === "Other" ? m.customRelationship || "Relative" : m.relationship} ({m.fullName})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Full Name</label>
                  <Input placeholder="Enter patient's name" value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} className="h-14 bg-card rounded-2xl" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Age</label>
                    <Input type="text" inputMode="numeric" maxLength={3} placeholder="e.g. 45" value={patient.age} onChange={(e) => setPatient({ ...patient, age: sanitizeAge(e.target.value) })} className="h-14 bg-card rounded-2xl" />
                  </div>
                  <div className="flex-[2]">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Gender</label>
                    <div className="flex gap-2">
                      {["Male", "Female"].map((g) => (
                        <button key={g} onClick={() => setPatient({ ...patient, gender: g })} className={`flex-1 h-14 rounded-2xl font-bold text-sm border ${patient.gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-card border-border/50 text-foreground"}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Mobile Number</label>
                  <Input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={patient.mobile} onChange={(e) => setPatient({ ...patient, mobile: sanitizePhone(e.target.value) })} className="h-14 bg-card rounded-2xl" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Optional Notes</label>
                  <Textarea placeholder="e.g., High BP history, feels dizzy" value={patient.notes} onChange={(e) => setPatient({ ...patient, notes: e.target.value })} className="min-h-[100px] bg-card rounded-2xl resize-none" />
                </div>
              </div>
              <div className="mt-8">
                <button
                  onClick={progressToPayment}
                  disabled={!patient.name || !patient.age || !patient.gender || patient.mobile.length !== 10}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Proceed to Check Out
                </button>
              </div>
            </motion.div>
          )}

          {step === "PAYMENT" && (
            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 pb-36">
              <h2 className="text-xl font-black mb-4">Check Out</h2>

              {/* Appointment Details */}
              <div className="bg-card border border-border/50 rounded-3xl p-4 mb-4 shadow-sm">
                <button onClick={() => setAppointmentOpen(!appointmentOpen)} className="w-full flex items-center justify-between">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" /> Appointment Details
                  </h3>
                  {appointmentOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {appointmentOpen && (
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{selectedLab?.name ?? "Partner Diagnostic Lab"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{(dateOptions.find(o => o.id === appointment.date)?.label || appointment.date)} • {appointment.timeSlot}</span>
                    </div>
                    {selectedAddress && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{selectedAddress.fullAddress}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order & Patient Details */}
              <div className="bg-card border border-border/50 rounded-3xl p-4 mb-4 shadow-sm">
                <button onClick={() => setOrderOpen(!orderOpen)} className="w-full flex items-center justify-between">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" /> Order & Patient Details
                  </h3>
                  {orderOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {orderOpen && (
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-foreground">{patient.name}</span>
                      <span className="text-muted-foreground font-medium">{patient.age} yrs • {patient.gender} • +91 {patient.mobile}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-border/30">
                      <span className="font-medium text-foreground">Home BP Check — {selectedLab?.name}</span>
                      <span className="font-bold text-foreground">₹{rawPrice}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Offers & Benefits */}
              <div className="bg-card border border-border/50 rounded-3xl p-4 mb-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600" /> Offers & Benefits
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Apply Coupon (e.g. HEALTH100)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={couponApplied}
                    className="h-11 bg-muted/50 rounded-xl text-xs font-semibold uppercase tracking-wider"
                  />
                  <Button
                    onClick={applyCoupon}
                    disabled={couponApplied || !couponCode.trim()}
                    className="h-11 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {couponApplied ? "Applied" : "Apply"}
                  </Button>
                </div>
                {couponApplied && (
                  <Badge variant="softSuccess" className="mt-2.5 text-[11px] font-bold">
                    HEALTH100 applied — ₹100 off
                  </Badge>
                )}
              </div>

              {/* Bill Summary */}
              <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Bill Summary</h3>
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>MRP Total</span>
                  <span className="text-foreground">₹{rawPrice}.00</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Home Visit Fee</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Coupon Discount</span>
                    <span className="text-emerald-600 font-bold">- ₹{discount}.00</span>
                  </div>
                )}
                <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                  <span className="text-sm font-black text-foreground">Payable Amount</span>
                  <span className="text-lg font-black text-blue-600">₹{price}.00</span>
                </div>
              </div>

              {/* Bottom Payment Bar */}
              <div className="fixed bottom-0 left-0 right-0 w-full md:max-w-[430px] mx-auto bg-card/95 backdrop-blur-xl border-t border-border/50 px-4 py-3 z-40 shadow-2xl">
                <div className="flex items-center gap-3">
                  {/* Payment Method Selector button */}
                  <button
                    onClick={() => navigate("/payment-methods", { state: { selectedMethod: selectedPaymentMethod.id, total: price } })}
                    className="flex items-center gap-2 text-left shrink-0 active:scale-95 transition-transform"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pay Using</span>
                      <span className="block text-xs font-bold text-foreground flex items-center gap-0.5">
                        {selectedPaymentMethod.name} <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </span>
                    </div>
                  </button>

                  {/* Place Order Button */}
                  <Button
                    onClick={handlePayment}
                    disabled={placing}
                    className="flex-1 h-13 rounded-2xl text-sm font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {placing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>{placing ? "Placing Order…" : `Place Order • ₹${price}`}</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "SUMMARY" && (
            <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
              <h2 className="text-xl font-black mb-6">Booking Summary</h2>

              <div className="bg-card border border-border/50 rounded-3xl p-5 mb-6 shadow-sm">
                <div className="flex items-start gap-4 mb-5 pb-5 border-b border-border/40">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    <HeartPulse className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-foreground mb-1">Home BP Check</h3>
                    <p className="text-xs font-medium text-muted-foreground">{selectedLab?.name}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-foreground">{patient.name}</span>
                      <span className="block text-[11px] font-medium text-muted-foreground">{patient.age} yrs • {patient.gender} • +91 {patient.mobile}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-foreground">{appointment.date}</span>
                      <span className="block text-[11px] font-medium text-muted-foreground">{appointment.timeSlot}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-foreground">Visit Address</span>
                      <span className="block text-[11px] font-medium text-muted-foreground leading-relaxed">{selectedAddress?.fullAddress}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border/50 rounded-3xl p-5 mb-6 shadow-sm">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-muted-foreground mb-4">Payment Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="font-semibold text-muted-foreground">Visit Charge</span><span className="font-bold text-foreground">₹{price}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-muted-foreground">Convenience Fee</span><span className="font-bold text-success">Free</span></div>
                  <div className="flex justify-between pt-3 border-t border-border/40"><span className="font-black text-foreground">Total</span><span className="font-black text-blue-600 text-lg">₹{price}</span></div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handlePayment}
                  disabled={placing}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {placing ? "Placing…" : `Proceed to Pay ₹${price}`}
                </button>
              </div>
            </motion.div>
          )}

          {step === "SUCCESS" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex flex-col items-center justify-center min-h-[85vh] px-4 py-6 text-center overflow-hidden"
            >
              {/* Confetti */}
              <AnimatePresence>
                {showConfetti && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <ConfettiPiece key={i} index={i} />
                    ))}
                  </div>
                )}
              </AnimatePresence>

              {/* Radiating rings behind checkmark */}
              <div className="relative mb-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-primary/20"
                    initial={{ scale: 0.8, opacity: 0.6 }}
                    animate={{ scale: 2 + i * 0.8, opacity: 0 }}
                    transition={{
                      duration: 2,
                      delay: 0.5 + i * 0.3,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    style={{ width: 96, height: 96, top: 0, left: 0 }}
                  />
                ))}

                {/* Glow */}
                <motion.div
                  className="absolute -inset-4 rounded-full bg-primary/10 blur-xl"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 0.6, 0.3], scale: [0.5, 1.2, 1] }}
                  transition={{ duration: 1.2, delay: 0.2 }}
                />

                {/* Checkmark circle */}
                <motion.div
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center shadow-lg mx-auto"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                  style={{ boxShadow: "0 8px 40px -8px hsl(var(--primary) / 0.5)" }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                  >
                    <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                  </motion.div>
                </motion.div>
              </div>

              {/* Title & Subtitle */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-2"
              >
                <h1 className="text-2xl font-black text-foreground">Booking Confirmed!</h1>
              </motion.div>

              <motion.p
                className="text-muted-foreground text-xs font-medium max-w-xs mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {selectedLab?.name ?? "Our partner lab"} will visit you for Home BP Check {appointment.date.toLowerCase()}.
              </motion.p>

              {/* Booking details card */}
              <motion.div
                className="w-full max-w-sm bg-card border border-border/50 rounded-3xl p-5 mb-6 text-left shadow-sm space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {/* Booking ID */}
                <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Booking ID</p>
                      <p className="text-sm font-black text-foreground truncate">{orderNumber ?? "HS20260728-BP"}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Confirmed
                    </span>
                  </div>
                </div>

                {/* Expected Arrival */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expected Arrival</p>
                    <p className="text-xs font-bold text-foreground">{appointment.date}, {appointment.timeSlot}</p>
                  </div>
                </div>

                {/* Patient info */}
                {patient.name && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Patient</p>
                      <p className="text-xs font-bold text-foreground truncate">{patient.name} ({patient.age} yrs • {patient.gender})</p>
                    </div>
                  </div>
                )}

                {/* Assigned Lab */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Lab</p>
                    <p className="text-xs font-bold text-foreground truncate">{selectedLab?.name ?? "Partner Diagnostic Center"}</p>
                  </div>
                </div>

                {/* Visit Address */}
                {selectedAddress && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visit Address</p>
                      <p className="text-xs font-medium text-foreground truncate">{selectedAddress.fullAddress}</p>
                    </div>
                  </div>
                )}

                {/* Bill Amount */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-muted-foreground">Amount Paid</span>
                  </div>
                  <span className="text-base font-black text-blue-600">₹{price}</span>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                className="w-full max-w-sm space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  className="w-full h-12 rounded-2xl text-sm font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                  onClick={() => navigate("/bookings")}
                >
                  <Package className="w-4 h-4" />
                  View My Bookings
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 rounded-2xl text-sm font-bold gap-2 border-border/60 text-foreground"
                  onClick={() => navigate("/")}
                >
                  <Home className="w-4 h-4" />
                  Back to Home
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>

      <AddFamilyMemberDialog
        open={showAddFamilyDialog}
        onOpenChange={setShowAddFamilyDialog}
        onAdd={handleAddFamilyMember}
        existingMembers={familyMembers}
      />
    </MobileLayout>
  );
};

export default BPCheckScreen;
