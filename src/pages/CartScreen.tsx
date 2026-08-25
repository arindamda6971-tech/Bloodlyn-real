import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ShoppingCart, Check, UserPlus, Plus, MapPin, ChevronRight, User as UserIcon, Info, Activity, Lock, UploadCloud, FileText } from "lucide-react";
import {
  getStoredPrescription,
  setStoredPrescription,
  clearStoredPrescription,
  uploadPrescription,
  validatePrescriptionFile,
  deletePrescription,
  type StoredPrescription,
} from "@/lib/order-prescription";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BookingStepper from "@/components/BookingStepper";
import { useCart } from "@/contexts/CartContext";
import { sanitizeAge, sanitizePhone } from "@/utils/inputSanitizers";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useSEO } from "@/hooks/useSEO";

import { supabase } from "@/integrations/supabase/client";

interface SavedAddress {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  type: string | null;
  is_default: boolean | null;
}

// Session storage keys for persisting patient details
const PATIENT_STORAGE_KEY = "bloodlyn-patient-details";

const loadPatientDetails = () => {
  try {
    const saved = sessionStorage.getItem(PATIENT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore malformed session data and continue with defaults.
  }
  return null;
};

const savePatientDetails = (details: any) => {
  try {
    sessionStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(details));
  } catch {
    // Ignore sessionStorage write failures in restricted environments.
  }
};

const clearPatientDetails = () => {
  try {
    sessionStorage.removeItem(PATIENT_STORAGE_KEY);
  } catch {
    // Ignore sessionStorage cleanup failures.
  }
};

const CartScreen = () => {
  useSEO({ title: "Your Cart | BloodLyn", description: "Review your selected diagnostic tests and proceed to lab selection and secure checkout." });
  const navigate = useNavigate();
  const location = useLocation();
  const { items, addToCart, removeFromCart, subtotal, currentLabName, currentLabId, isLoading, updateFamilyMember } = useCart();
  const { supabaseUserId, user } = useAuth();
  const { members: familyMembers, addMember } = useFamilyMembers();
  const [selfProfile, setSelfProfile] = useState<{ full_name: string; age: string; gender: string; phone: string } | null>(null);

  // Handle returning from AddFamilyMemberScreen
  const locationState = (location as any).state;
  useEffect(() => {
    if (locationState?.newMember && !locationState?.editMemberId) {
      addMember(locationState.newMember);
      // Clear the state to prevent re-adding
      window.history.replaceState({}, document.title);
    }
  }, [locationState]);

  // Load persisted patient details
  const saved = loadPatientDetails();
  const [selectedMemberId, setSelectedMemberId] = useState<string | "self">(saved?.selectedMemberId || "self");
  const [patientName, setPatientName] = useState(saved?.patientName || "");
  const [patientAge, setPatientAge] = useState(saved?.patientAge || "");
  const [patientGender, setPatientGender] = useState(saved?.patientGender || "");
  const [patientPhone, setPatientPhone] = useState(saved?.patientPhone || "");

  // Validation highlight
  const [showValidation, setShowValidation] = useState(false);
  const [isMemberDetailsExpanded, setIsMemberDetailsExpanded] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);


  // Address
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(saved?.selectedAddressId || null);
  const [addressLoading, setAddressLoading] = useState(true);

  // Prescription attachment (optional) — travels to the lab with the order
  const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const [prescription, setPrescription] = useState<StoredPrescription | null>(() => getStoredPrescription());
  const [prescriptionUploading, setPrescriptionUploading] = useState(false);

  const handlePrescriptionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!supabaseUserId) {
      toast.error("Please login to attach a prescription");
      return;
    }
    const validationError = validatePrescriptionFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setPrescriptionUploading(true);
    try {
      const uploaded = await uploadPrescription(file, supabaseUserId);
      setPrescription(uploaded);
      setStoredPrescription(uploaded);
      toast.success("Prescription attached");
    } catch (err: any) {
      console.error("Prescription upload failed:", err);
      toast.error(err?.message || "Could not upload the prescription. Please try again.");
    } finally {
      setPrescriptionUploading(false);
    }
  };

  const handleRemovePrescription = () => {
    if (prescription?.path) deletePrescription(prescription.path);
    setPrescription(null);
    clearStoredPrescription();
  };



  const isPatientInfoValid =
    patientName.trim().length > 0 &&
    /^\d{1,3}$/.test(patientAge) &&
    Number(patientAge) > 0 &&
    Number(patientAge) <= 120 &&
    patientGender.trim().length > 0 &&
    /^\d{10}$/.test(patientPhone) &&
    selectedAddressId !== null;

  // Persist patient details on change
  useEffect(() => {
    savePatientDetails({
      selectedMemberId,
      patientName,
      patientAge,
      patientGender,
      patientPhone,
      selectedAddressId,
    });
  }, [selectedMemberId, patientName, patientAge, patientGender, patientPhone, selectedAddressId]);

  // Clear patient details when cart becomes empty
  useEffect(() => {
    if (!isLoading && items.length === 0) {
      clearPatientDetails();
    }
  }, [items.length, isLoading]);

  // Fetch profile so 'Self' patient details are auto-filled from profile
  useEffect(() => {
    const fetchSelfProfile = async () => {
      if (!supabaseUserId) { setSelfProfile(null); return; }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, date_of_birth, gender, phone")
        .eq("id", supabaseUserId)
        .maybeSingle();
      let age = "";
      const dob = (data as any)?.date_of_birth as string | undefined;
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          const diff = Date.now() - d.getTime();
          const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
          if (years > 0 && years <= 120) age = String(years);
        }
      }
      const phoneRaw = (data as any)?.phone || user?.phone || "";
      const phone = String(phoneRaw).replace(/\D/g, "").slice(-10);
      setSelfProfile({
        full_name: (data as any)?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "",
        age,
        gender: (data as any)?.gender || "",
        phone,
      });
    };
    fetchSelfProfile();
  }, [supabaseUserId, user]);

  useEffect(() => {
    if (selectedMemberId === "self") {
      // Prefer saved session values; otherwise prefill from profile
      if (!saved?.patientName && selfProfile) {
        setPatientName(selfProfile.full_name);
        setPatientAge(selfProfile.age);
        setPatientGender(selfProfile.gender);
        setPatientPhone(selfProfile.phone);
      } else if (!saved?.patientName && !selfProfile) {
        setPatientName(""); setPatientAge(""); setPatientGender(""); setPatientPhone("");
      }
    } else {
      const member = familyMembers.find((m) => m.id === selectedMemberId);
      if (member) {
        setPatientName(member.fullName); setPatientAge(member.age);
        setPatientGender(member.gender); setPatientPhone(member.phone);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, familyMembers, selfProfile]);

  // Fetch saved addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!supabaseUserId) { setAddressLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from("addresses")
          .select("id, address_line1, address_line2, city, state, pincode, type, is_default")
          .eq("user_id", supabaseUserId)
          .order("is_default", { ascending: false });
        if (!error && data) {
          setSavedAddresses(data);
          if (!selectedAddressId) {
            const defaultAddr = data.find((a) => a.is_default);
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
            else if (data.length > 0) setSelectedAddressId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching addresses:", err);
      } finally { setAddressLoading(false); }
    };
    fetchAddresses();
  }, [supabaseUserId]);



  const requiresFasting = items.some(i => {
    const name = i.name.toLowerCase();
    return name.includes("fasting") || name.includes("sugar") || name.includes("lipid") || name.includes("cholesterol") || name.includes("fbs");
  });

  
  const formatAddress = (addr: SavedAddress) => {
    const parts = [addr.address_line1];
    if (addr.address_line2) parts.push(addr.address_line2);
    if (addr.city) parts.push(addr.city);
    if (addr.pincode) parts.push(addr.pincode);
    return parts.join(", ");
  };

  const handleCheckout = () => {
    if (isCheckingOut) return;
    
    if (!supabaseUserId) {
      toast.error("Please login to proceed with checkout");
      navigate("/login", { state: { returnTo: "/cart" } });
      return;
    }

    if (!isPatientInfoValid) {
      setShowValidation(true);
      toast.error("Please fill all required fields");
      return;
    }

    setIsCheckingOut(true);

    // Strictly persist the patient → test mapping on every cart item before checkout
    const assignedMemberId = selectedMemberId === "self" ? undefined : selectedMemberId;
    items.forEach((item) => {
      if (item.familyMemberId !== assignedMemberId) {
        updateFamilyMember(item.id, assignedMemberId);
      }
    });

    // Determine if the cart has a pre-selected lab (from vendor profile booking)

    navigate("/lab-selection", {
      state: {
        patientName: patientName.trim(),
        patientAge: patientAge ? Number(patientAge) : null,
        patientGender,
        patientPhone: patientPhone.trim(),
        addressId: selectedAddressId,
        familyMemberId: assignedMemberId || null,
        hasVendorLab,
      },
    });
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <ScreenHeader title="Cart" />
        <div className="px-4 pb-44">
          <div className="space-y-3 mt-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border border-border">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!items || items.length === 0) {
    return (
      <MobileLayout>
        <ScreenHeader title="Cart" />
        <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
          <div className="relative w-32 h-32 mb-6">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
            <div className="absolute inset-2 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
              <Activity className="w-6 h-6 text-rose-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-foreground mb-3 tracking-tight">Your health cart is empty</h2>
          <p className="text-[15px] font-medium text-muted-foreground mb-8 leading-relaxed max-w-[260px]">
            Explore our comprehensive health packages and individual tests to stay on top of your well-being.
          </p>
          <motion.div whileTap={{ scale: 0.95 }} className="w-full max-w-[240px]">
            <Button onClick={() => navigate("/categories")} className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-blue-600">
              Browse Health Packages
            </Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  const validationBorder = (isValid: boolean) =>
    showValidation && !isValid ? "ring-2 ring-destructive border-destructive" : "";

  const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
  const hasVendorLab = items.some((item) => item.labId && item.labName);
  const hasService = items.some(
    (item) =>
      item.id.startsWith("doc-") ||
      item.id.startsWith("physio-") ||
      item.id.startsWith("ecg-") ||
      item.name.includes(" with ")
  );
  const activeMemberName =
    selectedMemberId === "self"
      ? "You"
      : familyMembers.find((m) => m.id === selectedMemberId)?.fullName || "Member";
  const initials = (name?: string | null) =>
    String(name ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "U";

  return (
    <MobileLayout>
      <ScreenHeader title="Cart" />
      <BookingStepper currentStep={1} />

      <div className="px-4 pb-28 space-y-3.5">
        {/* Fasting Alert */}
        {requiresFasting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 shadow-sm"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
              <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-800 dark:text-amber-300">Fasting Required</h4>
              <p className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-snug">
                One or more tests require 10-12 hours of fasting. Drink only water before sample collection.
              </p>
            </div>
          </motion.div>
        )}

        {/* Collection point */}
        {currentLabName && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border/70 shadow-sm p-4 flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Collection Point</p>
              <h3 className="text-sm font-extrabold text-foreground truncate">{currentLabName}</h3>
            </div>
            
          </motion.div>
        )}



{/* Collection Address */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border/70 shadow-sm p-4 relative z-10">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-foreground text-sm tracking-tight">Collection Address</h3>
                
              </div>
            </div>
            
          </div>

          {addressLoading ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : savedAddresses.length === 0 ? (
            <button
              onClick={() => navigate("/saved-addresses")}
              className={`w-full rounded-2xl border-2 border-dashed transition-all p-5 ${showValidation && !selectedAddressId ? "border-destructive bg-destructive/5" : "border-primary/30 hover:border-primary/50 bg-primary/5"}`}
            >
              <div className="flex flex-col items-center py-2 text-center">
                <MapPin className="w-8 h-8 text-primary mb-2" />
                <p className="text-xs font-black text-foreground">Add Sample Collection Address</p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">Tap here to select or create your address</p>
              </div>
            </button>
          ) : (
            (() => {
              const addr =
                savedAddresses.find((a) => a.id === selectedAddressId) ??
                savedAddresses.find((a) => a.is_default) ??
                savedAddresses[0];
              if (!addr) return null;
              return (
                <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{addr.type || "Home"}</span>
                        {addr.is_default && (
                          <Badge variant="soft" className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0">Default</Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5 line-clamp-2">{formatAddress(addr)}</p>
                    </div>
                    <Check className="w-4 h-4 text-primary shrink-0 mt-1" />
                  </div>
                </div>
              );
            })()
          )}
        </motion.div>


        
        {/* Booking for — member selector + patient details */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border/70 shadow-sm p-4"
        >
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-extrabold text-foreground">Select family member</h3>
          </div>

          {/* Member pills (compact) */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                if (selectedMemberId === "self") setIsMemberDetailsExpanded(!isMemberDetailsExpanded);
                else { setSelectedMemberId("self"); setIsMemberDetailsExpanded(true); }
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border ${
                selectedMemberId === "self"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border/70 hover:border-primary/50"
              }`}
            >
              You
            </button>
            {familyMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (selectedMemberId === m.id) setIsMemberDetailsExpanded(!isMemberDetailsExpanded);
                  else { setSelectedMemberId(m.id); setIsMemberDetailsExpanded(true); }
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border ${
                  selectedMemberId === m.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border/70 hover:border-primary/50"
                }`}
              >
                {m.fullName}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate("/add-family-member", { state: { returnTo: "/cart" } })}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold border border-dashed border-primary/50 text-primary flex items-center gap-1.5 hover:bg-primary/5 transition-all"
            >
              <UserPlus className="w-3 h-3" /> Add new
            </button>
          </div>

          {/* Patient details */}
          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label htmlFor="patient_name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Full Name *</Label>
              <Input
                id="patient_name"
                placeholder="Enter full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className={`bg-transparent border-0 border-b-2 border-border/60 rounded-none h-9 px-1 text-sm font-semibold shadow-none focus-visible:ring-0 focus-visible:border-primary transition-colors ${showValidation && !patientName.trim() ? "!border-destructive" : ""}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1">
                <Label htmlFor="patient_age" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Age *</Label>
                <Input
                  id="patient_age"
                  placeholder="Age"
                  value={patientAge}
                  onChange={(e) => setPatientAge(sanitizeAge(e.target.value))}
                  className={`bg-transparent border-0 border-b-2 border-border/60 rounded-none h-9 px-1 text-sm font-semibold shadow-none focus-visible:ring-0 focus-visible:border-primary transition-colors ${showValidation && (!/^\d{1,3}$/.test(patientAge) || Number(patientAge) <= 0) ? "!border-destructive" : ""}`}
                  maxLength={3}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="patient_gender" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Gender *</Label>
                <Select value={patientGender} onValueChange={setPatientGender}>
                  <SelectTrigger className={`bg-transparent border-0 border-b-2 border-border/60 rounded-none h-9 px-1 text-sm font-semibold shadow-none focus:ring-0 focus:border-primary transition-colors ${showValidation && !patientGender ? "!border-destructive" : ""}`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="patient_phone" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Patient Phone *</Label>
              <div className={`flex items-center gap-2 border-b-2 border-border/60 focus-within:border-primary transition-colors ${showValidation && !/^\d{10}$/.test(patientPhone) ? "!border-destructive" : ""}`}>
                <span className="text-xs font-extrabold text-muted-foreground pl-1">+91</span>
                <Input
                  id="patient_phone"
                  placeholder="10-digit number"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(sanitizePhone(e.target.value))}
                  className="bg-transparent border-0 rounded-none h-9 px-1 flex-1 text-sm font-semibold shadow-none focus-visible:ring-0"
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
              {patientPhone.length > 0 && !/^\d{10}$/.test(patientPhone) && (
                <p className="text-[10px] font-bold text-destructive pl-1">Must be exactly 10 digits</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Selected tests */}
        <div className="pt-1">
          

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            {/* Consultations Group */}
            {items.some(i => i.name.includes(" with ") || i.id.startsWith("doc-") || i.id.startsWith("physio-")) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Consultations</h3>
                {items.filter(i => i.name.includes(" with ") || i.id.startsWith("doc-") || i.id.startsWith("physio-")).map((item, index) => {
                  let doctorName = "";
                  let serviceTitle = item.name;
                  if (item.name.includes(" with Dr. ")) {
                    const parts = item.name.split(" with Dr. ");
                    serviceTitle = parts[0].trim();
                    doctorName = "Dr. " + parts[1].trim();
                  } else if (item.name.includes(" with ")) {
                    const parts = item.name.split(" with ");
                    serviceTitle = parts[0].trim();
                    doctorName = parts[1].trim();
                  }

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      {doctorName && (
                        <div className="bg-primary/5 px-4 py-2 border-b border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">👨‍⚕️</span>
                            <span className="text-xs font-bold text-primary tracking-tight">{doctorName}</span>
                          </div>
                          <Badge variant="soft" className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5">
                            Assigned Specialist
                          </Badge>
                        </div>
                      )}

                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-foreground text-sm leading-snug">{serviceTitle}</h3>
                          {item.price > 0 && !!item.labId && (
                            <p className="text-base font-black text-foreground mt-1.5 tabular-nums">₹{item.price}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 hover:bg-rose-500/20 active:scale-90 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Lab Tests Group */}
            {items.some(i => !(i.name.includes(" with ") || i.id.startsWith("doc-") || i.id.startsWith("physio-"))) && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Tests & Packages ({items.filter(i => !(i.name.includes(" with ") || i.id.startsWith("doc-") || i.id.startsWith("physio-"))).length})</h3>
                {items.filter(i => !(i.name.includes(" with ") || i.id.startsWith("doc-") || i.id.startsWith("physio-"))).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-sm hover:shadow-md transition-all p-4 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      
                      <h3 className="font-extrabold text-foreground text-sm leading-snug">{item.name}</h3>
                      {item.price > 0 && !!item.labId && (
                        <p className="text-base font-black text-foreground mt-1.5 tabular-nums">₹{item.price}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 hover:bg-rose-500/20 active:scale-90 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          <button
            onClick={() => navigate("/categories")}
            className="w-full mt-3 py-3.5 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/50 bg-primary/5 text-primary text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
          >
            <Plus className="w-4 h-4" />
            {hasService ? "Add more services or tests" : "Add more tests"}
          </button>

          {/* Upload Prescription Tile */}
          <input
            ref={prescriptionInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={handlePrescriptionChange}
          />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { if (!prescription && !prescriptionUploading) prescriptionInputRef.current?.click(); }}
            className="mt-4 bg-card rounded-2xl border border-border/70 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {prescriptionUploading ? (
                <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : prescription ? (
                <FileText className="w-5 h-5 text-primary" />
              ) : (
                <UploadCloud className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {prescription ? "Attached" : "Optional"}
              </p>
              <h3 className="text-sm font-extrabold text-foreground truncate">
                {prescriptionUploading ? "Uploading…" : prescription ? prescription.name : "Upload Prescription"}
              </h3>
              {prescription && (
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {(prescription.size / 1024 / 1024).toFixed(2)} MB · shared with the lab
                </p>
              )}
            </div>
            {prescription ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemovePrescription(); }}
                className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 active:scale-90 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/5 text-primary flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
            )}
          </motion.div>

        </div>

        {/* Checkout Bar (Moved Inline) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.25 }}
          className="mt-6 bg-card rounded-2xl border border-border/70 p-4 shadow-sm mb-4"
        >
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-0.5">Total Amount</p>
              <h2 className="text-2xl font-black text-foreground tabular-nums leading-none">
                ₹{hasVendorLab ? subtotal : items.reduce((acc, curr) => acc + curr.price * (curr.quantity || 1), 0)}
              </h2>
            </div>
            
            <Button
              size="lg"
              className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base shadow-md shadow-primary/20"
              onClick={handleCheckout}
              disabled={isCheckingOut || addressLoading || (items.length > 0 && items.some(i => i.labId) && !currentLabId)}
            >
              <span className="flex items-center gap-2">
                Checkout
                <ChevronRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        </motion.div>

      </div>
    </MobileLayout>
  );
};

export default CartScreen;
