import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, ShoppingCart, Check, UserPlus, Plus, MapPin, ChevronRight } from "lucide-react";
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
  const { items, removeFromCart, subtotal, currentLabName, isLoading, updateFamilyMember } = useCart();
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
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Address
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(saved?.selectedAddressId || null);
  const [addressLoading, setAddressLoading] = useState(true);

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

  
  const formatAddress = (addr: SavedAddress) => {
    const parts = [addr.address_line1];
    if (addr.address_line2) parts.push(addr.address_line2);
    if (addr.city) parts.push(addr.city);
    if (addr.pincode) parts.push(addr.pincode);
    return parts.join(", ");
  };

  const handleCheckout = () => {
    if (isCheckingOut) return;
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
    const hasVendorLab = items.some((item) => item.labId && item.labName);

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
        <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingCart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground mb-6">Add tests to your cart to proceed with booking</p>
          <Button onClick={() => navigate("/categories")}>Browse Tests</Button>
        </div>
      </MobileLayout>
    );
  }

  const validationBorder = (isValid: boolean) =>
    showValidation && !isValid ? "ring-2 ring-destructive border-destructive" : "";

  return (
    <MobileLayout>
      <ScreenHeader title="Cart" />
      <BookingStepper currentStep={1} />

      <div className="px-4 pb-64">
        {(() => {
          const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
          const hasService = items.some((item) => item.id.startsWith("doc-") || item.id.startsWith("physio-") || item.id.startsWith("ecg-") || item.name.includes(" with "));
          const itemLabel = hasService ? (totalQty === 1 ? "Service" : "Services") : (totalQty === 1 ? "Test" : "Tests");
          return (
            <div className="flex items-center justify-between mt-2 mb-3">
              <h2 className="text-base font-extrabold text-foreground tracking-tight">
                {totalQty} {itemLabel} Selected
              </h2>
              <span className="text-xs font-bold text-muted-foreground">
                Subtotal: <span className="text-primary font-black">₹{subtotal}</span>
              </span>
            </div>
          );
        })()}

        {/* Cart items */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {items.map((item, index) => {
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
                className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-2xs hover:shadow-xs transition-all"
              >
                {doctorName ? (
                  <>
                    {/* Upper Tile for Doctor Name */}
                    <div className="bg-primary/5 px-4 py-2 border-b border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">👨‍⚕️</span>
                        <span className="text-xs font-bold text-primary tracking-tight">
                          {doctorName}
                        </span>
                      </div>
                      <Badge variant="soft" className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5">
                        Assigned Specialist
                      </Badge>
                    </div>

                    {/* Lower Section for Service / Physio Booking */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-foreground text-sm leading-snug">{serviceTitle}</h3>
                        {item.price > 0 && (
                          <p className="text-xs font-black text-primary mt-1">₹{item.price}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8.5 h-8.5 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 hover:bg-rose-500/20 active:scale-90 transition-all"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-foreground text-sm leading-snug">{item.name}</h3>
                      {item.price > 0 && (
                        <p className="text-xs font-black text-primary mt-1">₹{item.price}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-8.5 h-8.5 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 hover:bg-rose-500/20 active:scale-90 transition-all"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <button
          onClick={() => navigate("/categories")}
          className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/50 bg-primary/5 text-primary text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
        >
          <Plus className="w-4 h-4" />
          {items.some((item) => item.id.startsWith("doc-") || item.id.startsWith("physio-") || item.id.startsWith("ecg-") || item.name.includes(" with "))
            ? "Add More Services or Tests"
            : "Add More Tests or Health Checks"}
        </button>

        {/* Patient Details Section */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 bg-card rounded-3xl border border-border/60 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-extrabold text-foreground text-sm tracking-tight">Patient Details</h3>
              <p className="text-[11px] font-semibold text-muted-foreground">Select or enter details for sample report</p>
            </div>
            <button
              onClick={() => navigate("/add-family-member", { state: { returnTo: "/cart" } })}
              className="flex items-center gap-1 text-xs font-extrabold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/15 active:scale-95 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Member
            </button>
          </div>

          {/* Quick Horizontal Patient Selector Chips */}
          <div className="mb-4 pt-1">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedMemberId("self")}
                className={`px-4 py-2 rounded-full text-xs font-extrabold border shrink-0 transition-all active:scale-95 ${
                  selectedMemberId === "self"
                    ? "bg-primary text-white border-primary shadow-xs ring-1 ring-primary/30"
                    : "bg-muted/60 hover:bg-muted text-foreground border-border/60"
                }`}
              >
                Self
              </button>
              {familyMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold border shrink-0 transition-all active:scale-95 ${
                    selectedMemberId === m.id
                      ? "bg-primary text-white border-primary shadow-xs ring-1 ring-primary/30"
                      : "bg-muted/60 hover:bg-muted text-foreground border-border/60"
                  }`}
                >
                  {m.fullName} ({m.relationship === "Other" ? m.customRelationship : m.relationship})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="patient_name" className="text-xs font-bold text-foreground">Full Name *</Label>
              <Input
                id="patient_name"
                placeholder="Enter full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className={`bg-muted/60 border-0 rounded-2xl h-11 text-xs font-medium ${validationBorder(patientName.trim().length > 0)}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="patient_age" className="text-xs font-bold text-foreground">Age *</Label>
                <Input
                  id="patient_age"
                  placeholder="Age"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value.replace(/[^0-9]/g, ""))}
                  className={`bg-muted/60 border-0 rounded-2xl h-11 text-xs font-medium ${validationBorder(/^\d{1,3}$/.test(patientAge) && Number(patientAge) > 0 && Number(patientAge) <= 120)}`}
                  maxLength={3}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="patient_gender" className="text-xs font-bold text-foreground">Gender *</Label>
                <Select value={patientGender} onValueChange={setPatientGender}>
                  <SelectTrigger className={`bg-muted/60 border-0 rounded-2xl h-11 text-xs font-medium ${validationBorder(patientGender.trim().length > 0)}`}>
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
              <Label htmlFor="patient_phone" className="text-xs font-bold text-foreground">Patient Phone *</Label>
              <div className="flex items-center gap-2">
                <span className="flex h-11 items-center rounded-2xl bg-muted/60 px-3.5 text-xs font-bold text-muted-foreground select-none">+91</span>
                <Input
                  id="patient_phone"
                  placeholder="10-digit number"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  className={`bg-muted/60 border-0 rounded-2xl h-11 flex-1 text-xs font-medium ${validationBorder(/^\d{10}$/.test(patientPhone))}`}
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
              {patientPhone.length > 0 && !/^\d{10}$/.test(patientPhone) && (
                <p className="text-[11px] font-bold text-destructive mt-1">Phone must be exactly 10 digits</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Collection Address */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-foreground text-sm tracking-tight">Collection Address *</h3>
                <p className="text-[11px] font-semibold text-muted-foreground">Sample pickup location</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/saved-addresses")}
              className="text-xs font-extrabold text-primary flex items-center gap-0.5 bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/15 active:scale-95 transition-all"
            >
              Change Address <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {addressLoading ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : savedAddresses.length === 0 ? (
            <button
              onClick={() => navigate("/saved-addresses")}
              className={`w-full bg-card rounded-3xl border-2 border-dashed transition-all p-5 ${showValidation && !selectedAddressId ? "border-destructive bg-destructive/5" : "border-primary/30 hover:border-primary/50 bg-primary/5"}`}
            >
              <div className="flex flex-col items-center py-2 text-center">
                <MapPin className="w-8 h-8 text-primary mb-2" />
                <p className="text-xs font-black text-foreground">Add Sample Collection Address</p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">Tap here to select or create your address</p>
              </div>
            </button>
          ) : (
            <div className="space-y-2.5">
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full text-left bg-card rounded-2xl border p-3.5 transition-all shadow-2xs ${
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-primary/5 shadow-xs"
                        : showValidation && !selectedAddressId
                        ? "border-destructive bg-destructive/5"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? "bg-primary text-white shadow-xs" : "bg-muted text-muted-foreground"
                      }`}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{addr.type || "Home"}</span>
                          {addr.is_default && <Badge variant="soft" className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0">Default</Badge>}
                        </div>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5 line-clamp-2">{formatAddress(addr)}</p>
                      </div>
                      <div className="flex flex-col items-end justify-between shrink-0 gap-1.5 self-stretch">
                        {isSelected && (
                          <Check className="w-4.5 h-4.5 text-primary" />
                        )}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/saved-addresses");
                          }}
                          className="text-[11px] font-black text-primary hover:underline cursor-pointer bg-primary/10 px-2 py-0.5 rounded-md"
                        >
                          Change
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Sticky Order Summary & Checkout Drawer */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        className="fixed left-0 right-0 w-full md:max-w-[430px] mx-auto bg-card border-t border-border/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4.5 py-3 z-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Total Payable</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-foreground tabular-nums">₹{subtotal}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Free Sample Pickup</span>
            </div>
          </div>
          <Button
            variant="hero"
            className="px-8 h-12 text-sm font-extrabold shadow-md shadow-primary/20"
            size="lg"
            onClick={handleCheckout}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? "Please wait…" : "Checkout"}
          </Button>
        </div>
      </motion.div>
    </MobileLayout>
  );
};

export default CartScreen;
