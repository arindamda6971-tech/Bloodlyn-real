import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, HeartPulse, MapPin, Calendar, Clock, User, CheckCircle2,
  ChevronRight, AlertTriangle, Search, CreditCard, Building2, Star, Loader2,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { labServesPincode } from "@/hooks/useUserPincode";
import { toast } from "sonner";

type FlowStep =
  | "ADDRESS"
  | "AVAILABILITY"
  | "LAB"
  | "APPOINTMENT"
  | "DETAILS"
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

const BPCheckScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<FlowStep>("ADDRESS");
  const [bootLoading, setBootLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [pincode, setPincode] = useState("");
  const [labs, setLabs] = useState<BpLab[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [selectedLab, setSelectedLab] = useState<BpLab | null>(null);
  const [appointment, setAppointment] = useState<AppointmentDetails>({ date: "Today", timeSlot: "" });
  const [patient, setPatient] = useState<PatientDetails>({ name: "", age: "", gender: "", mobile: "", notes: "" });
  const [placing, setPlacing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Boot: load default address + profile, auto-skip to LAB when we have an address
  useEffect(() => {
    if (!user) { setBootLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [{ data: addrData }, { data: profData }] = await Promise.all([
        supabase
          .from("addresses")
          .select("id, type, address_line, city, state, pincode, is_default, created_at")
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

      const addrs: Address[] = (addrData || []).map((a: any) => ({
        id: a.id,
        type: a.type || "Home",
        fullAddress: [a.address_line, a.city, a.state, a.pincode].filter(Boolean).join(", "),
        pincode: a.pincode || "",
      }));
      setSavedAddresses(addrs);

      // Prefill patient from profile
      if (profData) {
        const dob = profData.date_of_birth ? new Date(profData.date_of_birth) : null;
        const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
        setPatient((p) => ({
          ...p,
          name: p.name || profData.full_name || "",
          gender: p.gender || (profData.gender ? profData.gender.charAt(0).toUpperCase() + profData.gender.slice(1) : ""),
          mobile: p.mobile || (profData.phone || "").replace(/\D/g, "").slice(-10),
          age: p.age || (age && age > 0 ? String(age) : ""),
        }));
      }

      // Auto-select default address + jump to LAB
      const def = addrs[0];
      if (def && def.pincode && /^\d{6}$/.test(def.pincode)) {
        setSelectedAddress(def);
        setPincode(def.pincode);
        setStep("LAB");
      } else {
        setStep("ADDRESS");
      }
      setBootLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch labs whenever we enter the LAB step
  useEffect(() => {
    if (step !== "LAB") return;
    let cancelled = false;
    setLabsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("diagnostic_centers")
        .select("id, name, rating, reviews_count, logo_url, home_bp_price, vendor_id, service_pincodes, pincode, is_active, offers_home_bp")
        .eq("offers_home_bp", true)
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (cancelled) return;
      if (error) {
        toast.error("Couldn't load labs. Try again.");
        setLabs([]);
      } else {
        const filtered = (data || []).filter((l: any) =>
          pincode ? labServesPincode(l, pincode) : true
        );
        setLabs(filtered as BpLab[]);
      }
      setLabsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [step, pincode]);

  const handleBack = () => {
    switch (step) {
      case "ADDRESS": navigate(-1); break;
      case "AVAILABILITY": setStep(selectedAddress ? "LAB" : "ADDRESS"); break;
      case "LAB": navigate(-1); break;
      case "APPOINTMENT": setStep("LAB"); break;
      case "DETAILS": setStep("APPOINTMENT"); break;
      case "SUMMARY": setStep("DETAILS"); break;
      case "SUCCESS": navigate("/"); break;
    }
  };

  const checkAvailability = async () => {
    if (pincode.length < 6) return;
    setStep("LAB");
  };

  const progressToSummary = () => {
    if (patient.name && patient.age && patient.gender && patient.mobile) {
      setStep("SUMMARY");
    }
  };

  const price = selectedLab?.home_bp_price ?? 299;

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
      const cartItems = [{
        id: `bp-${selectedLab.id}`,
        name: `Home BP Check — ${selectedLab.name}`,
        price,
        quantity: 1,
        labId: selectedLab.id,
        labName: selectedLab.name,
        vendorId: selectedLab.vendor_id || undefined,
        category: "BP Check",
      }];

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          cartItems,
          addressId: selectedAddress?.id ?? null,
          scheduledDate: appointment.date,
          scheduledTimeSlot: appointment.timeSlot,
          subtotal: price,
          discount: 0,
          total: price,
          paymentMethod: "online",
          couponCode: null,
          patientName: patient.name,
          patientAge: patient.age ? Number(patient.age) : null,
          patientGender: patient.gender,
          patientPhone: patient.mobile.replace(/\D/g, "").slice(-10),
          labId: selectedLab.id,
          labName: selectedLab.name,
          vendorId: selectedLab.vendor_id || null,
        },
        headers: {
          "Idempotency-Key": `bp-${user.id}-${selectedLab.id}-${appointment.date}-${appointment.timeSlot}`,
        },
      });

      if (error || !data?.orderId) {
        console.error("BP order error:", error, data);
        toast.error("Couldn't place your booking. Please try again.");
        setPlacing(false);
        return;
      }

      setOrderNumber(data.orderNumber || data.orderId);
      setStep("SUCCESS");
    } catch (e) {
      console.error("BP booking exception:", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const stepIndex = useMemo(() => {
    const order: FlowStep[] = ["LAB", "APPOINTMENT", "DETAILS", "SUMMARY"];
    const i = order.indexOf(step);
    return i < 0 ? 0 : i;
  }, [step]);
  const totalSteps = 4;

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
                  <p className="text-xs text-blue-700/70 mb-4">Add an address to book a home visit.</p>
                  <button
                    onClick={() => navigate("/saved-addresses")}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Add New Address
                  </button>
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
                  type="number"
                  placeholder="Enter 6-digit pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
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
              <p className="text-xs text-muted-foreground font-medium mb-5">
                Only labs offering Home BP Check for pincode <span className="font-bold text-foreground">{pincode}</span>
              </p>

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
              <div className="flex gap-3 mb-8">
                {["Today", "Tomorrow"].map((date) => (
                  <button
                    key={date}
                    onClick={() => setAppointment({ ...appointment, date })}
                    className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${
                      appointment.date === date
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                        : "bg-card border-border/50 text-foreground"
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Select Time Slot</p>
              <div className="space-y-3">
                {["Morning (8 AM - 12 PM)", "Afternoon (12 PM - 4 PM)", "Evening (4 PM - 8 PM)"].map((slot) => {
                  const isSelected = appointment.timeSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setAppointment({ ...appointment, timeSlot: slot })}
                      className={`w-full p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 text-left ${
                        isSelected ? "bg-primary/5 border-primary shadow-sm" : "bg-card border-slate-200/80"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className={`text-[15px] font-bold ${isSelected ? "text-primary" : "text-slate-800"}`}>{slot}</span>
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
              <h2 className="text-xl font-black mb-6">Patient Information</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Full Name</label>
                  <Input placeholder="Enter patient's name" value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} className="h-14 bg-card rounded-2xl" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Age</label>
                    <Input type="number" placeholder="e.g. 45" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} className="h-14 bg-card rounded-2xl" />
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
                  <Input type="tel" inputMode="numeric" placeholder="10-digit mobile" value={patient.mobile} onChange={(e) => setPatient({ ...patient, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="h-14 bg-card rounded-2xl" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Optional Notes</label>
                  <Textarea placeholder="e.g., High BP history, feels dizzy" value={patient.notes} onChange={(e) => setPatient({ ...patient, notes: e.target.value })} className="min-h-[100px] bg-card rounded-2xl resize-none" />
                </div>
              </div>
              <div className="mt-8">
                <button
                  onClick={progressToSummary}
                  disabled={!patient.name || !patient.age || !patient.gender || patient.mobile.length !== 10}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Review Booking
                </button>
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
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 h-[100dvh] flex flex-col bg-blue-600 text-white relative overflow-hidden">
              <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-40 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
                  <CheckCircle2 className="w-12 h-12 text-blue-600" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-center mb-2">Booking Confirmed!</h1>
                <p className="text-blue-100 font-medium text-center mb-10 max-w-[280px]">
                  {selectedLab?.name} will visit you {appointment.date.toLowerCase()}.
                </p>
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 w-full border border-white/20">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/20">
                    <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Booking ID</span>
                    <span className="font-black text-sm">{orderNumber ?? "—"}</span>
                  </div>
                  <div className="flex items-start gap-4 mb-4">
                    <Clock className="w-5 h-5 text-blue-200 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-0.5">Expected Arrival</span>
                      <span className="block font-black">{appointment.date}, {appointment.timeSlot}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Building2 className="w-5 h-5 text-blue-200 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-0.5">Assigned Lab</span>
                      <span className="block font-black text-sm">{selectedLab?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="w-full space-y-3 mt-10">
                  <button onClick={() => navigate("/bookings")} className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black text-[13px] shadow-xl active:scale-[0.98] transition-transform">
                    View My Bookings
                  </button>
                  <button onClick={() => navigate("/")} className="w-full bg-white/10 text-white py-3.5 rounded-2xl font-bold text-[13px] border border-white/20 active:scale-[0.98] transition-transform">
                    Back to Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
    </MobileLayout>
  );
};

export default BPCheckScreen;
