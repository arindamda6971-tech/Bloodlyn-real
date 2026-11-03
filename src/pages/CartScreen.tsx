import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Trash2, ShoppingCart, Check, UserPlus, Plus, MapPin, ChevronRight, User as UserIcon, Info, Activity, Lock, UploadCloud, FileText, Pencil, Loader2, FlaskConical, Building2, Home as HomeIcon } from "lucide-react";
import {
  getStoredPrescription,
  clearStoredPrescription,
  type StoredPrescription,
} from "@/lib/order-prescription";
import { PrescriptionUpload, type PrescriptionUploadHandle } from "@/components/booking/PrescriptionUpload";
import { useLiveTestRules } from "@/hooks/useLiveTestRules";
import { TestFacts } from "@/components/tests/TestFacts";
import { testNameParts, testSample } from "@/utils/simplify-test-name";
import { liveRuleFor } from "@/lib/prescription-requirement";

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
import { useUserPincode } from "@/hooks/useUserPincode";
import { isCompleteCollectionAddress } from "@/lib/service-pincode";

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
  const { pincode: servicePincode } = useUserPincode();
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
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    type: "Home",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
  });

  // Prescription for this booking, which travels to the lab with the order.
  // Optional unless the lab requires one for a test in the cart.
  const prescriptionUploadRef = useRef<PrescriptionUploadHandle>(null);
  const [prescription, setPrescription] = useState<StoredPrescription | null>(() => getStoredPrescription());
  const { prescriptionTests, rules: liveRules } = useLiveTestRules();



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
      clearStoredPrescription();
      setPrescription(null);

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
          const completeAddresses = data.filter(isCompleteCollectionAddress);
          const matchingAddresses = servicePincode
            ? completeAddresses.filter((address) => address.pincode.trim() === servicePincode)
            : completeAddresses;
          setSavedAddresses(matchingAddresses);
          if (!selectedAddressId || !matchingAddresses.some((address) => address.id === selectedAddressId)) {
            const defaultAddr = matchingAddresses.find((a) => a.is_default);
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
            else if (matchingAddresses.length > 0) setSelectedAddressId(matchingAddresses[0].id);
            else {
              setSelectedAddressId(null);
              setAddressFormOpen(true);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching addresses:", err);
      } finally { setAddressLoading(false); }
    };
    fetchAddresses();
  }, [supabaseUserId, servicePincode]);

  const openNewAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm({ type: "Home", address_line1: "", address_line2: "", city: "", state: "" });
    setAddressFormOpen(true);
  };

  const openEditAddressForm = (address: SavedAddress) => {
    setEditingAddressId(address.id);
    setAddressForm({
      type: address.type || "Home",
      address_line1: address.address_line1,
      address_line2: address.address_line2 || "",
      city: address.city,
      state: address.state,
    });
    setAddressFormOpen(true);
  };

  const saveCollectionAddress = async () => {
    if (!supabaseUserId || !servicePincode) {
      toast.error("Please select your service PIN first");
      return;
    }
    if (!addressForm.address_line1.trim() || !addressForm.city.trim() || !addressForm.state.trim()) {
      toast.error("Please enter your complete collection address");
      return;
    }
    setAddressSaving(true);
    try {
      const payload = {
        type: addressForm.type,
        address_line1: addressForm.address_line1.trim(),
        address_line2: addressForm.address_line2.trim() || null,
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: servicePincode,
      };
      if (editingAddressId) {
        const { data, error } = await supabase
          .from("addresses")
          .update(payload)
          .eq("id", editingAddressId)
          .eq("user_id", supabaseUserId)
          .select("id, address_line1, address_line2, city, state, pincode, type, is_default")
          .single();
        if (error) throw error;
        setSavedAddresses((current) => current.map((address) => address.id === data.id ? data : address));
        setSelectedAddressId(data.id);
      } else {
        const { data, error } = await supabase
          .from("addresses")
          .insert({ ...payload, user_id: supabaseUserId, is_default: savedAddresses.length === 0 })
          .select("id, address_line1, address_line2, city, state, pincode, type, is_default")
          .single();
        if (error) throw error;
        setSavedAddresses((current) => [data, ...current]);
        setSelectedAddressId(data.id);
      }
      setAddressFormOpen(false);
      toast.success("Collection address saved");
    } catch (error) {
      console.error("Collection address save failed:", error);
      toast.error("Could not save the address. Please try again.");
    } finally {
      setAddressSaving(false);
    }
  };



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

    if (prescriptionTests.length > 0 && !prescription) {
      toast.error("A prescription is required", { description: `The lab needs one for ${prescriptionTests.join(", ")}.` });
      prescriptionUploadRef.current?.pick();
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
      <MobileLayout showNav={false}>
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
      <MobileLayout showNav={false}>
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
          <div className="w-full max-w-[240px] active:scale-95 transition-transform duration-100 ease-out press">
            <Button onClick={() => navigate("/categories")} className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-blue-600">
              Browse Health Packages
            </Button>
          </div>
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

  const isServiceItem = (item: (typeof items)[number]) =>
    item.name.includes(" with ") || item.id.startsWith("doc-") || item.id.startsWith("physio-");
  const serviceItems = items.filter(isServiceItem);
  const testItems = items.filter((item) => !isServiceItem(item));
  const cartTotal = hasVendorLab ? subtotal : items.reduce((acc, curr) => acc + curr.price * (curr.quantity || 1), 0);
  // The patient form stays open until every field is filled; after that a one-line summary is enough.
  const patientDetailsValid =
    patientName.trim().length > 0 &&
    /^\d{1,3}$/.test(patientAge) &&
    Number(patientAge) > 0 &&
    Number(patientAge) <= 120 &&
    patientGender.trim().length > 0 &&
    /^\d{10}$/.test(patientPhone);
  const showPatientForm = isMemberDetailsExpanded || !patientDetailsValid;
  const pickMember = (id: string | "self") => {
    if (selectedMemberId === id) setIsMemberDetailsExpanded(!isMemberDetailsExpanded);
    else { setSelectedMemberId(id); setIsMemberDetailsExpanded(false); }
  };
  const fieldClass = (invalid: boolean) =>
    `h-11 rounded-xl bg-background text-sm font-semibold ${showValidation && invalid ? "border-destructive ring-1 ring-destructive" : ""}`;
  const addressIcon = (type?: string | null) => (type === "Office" ? Building2 : type === "Other" ? MapPin : HomeIcon);

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Cart" />
      <BookingStepper currentStep={1} />

      <div className="px-4 pb-4 space-y-3">
        {/* Fasting Alert */}
        {requiresFasting && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Fasting required</h4>
              <p className="text-xs text-amber-700/90 dark:text-amber-400/80 mt-0.5 leading-snug">
                One or more tests need 10-12 hours of fasting. Drink only water before sample collection.
              </p>
            </div>
          </div>
        )}

        {/* Tests, grouped under the lab that will collect them */}
        {testItems.length > 0 && (
          <section className="bg-card rounded-2xl border border-border/70 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{currentLabName || "Tests & packages"}</h3>
                <p className="text-[11px] text-muted-foreground">Sample collected from your address</p>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground shrink-0">
                {testItems.length} {testItems.length === 1 ? "test" : "tests"}
              </span>
            </div>

            <ul className="divide-y divide-border/60">
              {testItems.map((item) => (
                <li key={item.id} className="px-4 py-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground text-sm leading-snug">{testNameParts(item.name).title}</h4>
                    <TestFacts
                      withInstructions
                      className="mt-1"
                      test={{
                        ...item,
                        sampleType: testSample(item.name, item.sampleType),
                        reportTime: liveRuleFor(liveRules, item.name)?.reportTime,
                        prescriptionRequired: prescriptionTests.includes(item.name),
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {item.price > 0 && !!item.labId && (
                      <span className="text-sm font-black text-foreground tabular-nums">₹{item.price}</span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${testNameParts(item.name).title}`}
                      onClick={() => removeFromCart(item.id)}
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center active:scale-90 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => navigate("/categories")}
              className="w-full border-t border-border/60 py-3 text-primary text-xs font-bold flex items-center justify-center gap-1.5 active:bg-primary/5"
            >
              <Plus className="w-4 h-4" />
              {hasService ? "Add more services or tests" : "Add more tests"}
            </button>
          </section>
        )}

        {/* Consultations */}
        {serviceItems.length > 0 && (
          <section className="bg-card rounded-2xl border border-border/70 shadow-sm overflow-hidden">
            <h3 className="px-4 pt-3.5 pb-2 text-sm font-bold text-foreground">Consultations</h3>
            <ul className="divide-y divide-border/60">
              {serviceItems.map((item) => {
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
                  <li key={item.id} className="px-4 py-3.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm leading-snug">{serviceTitle}</h4>
                      {doctorName && <p className="text-xs font-semibold text-primary mt-0.5">{doctorName}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {item.price > 0 && !!item.labId && (
                        <span className="text-sm font-black text-foreground tabular-nums">₹{item.price}</span>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${serviceTitle}`}
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center active:scale-90 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {testItems.length === 0 && (
              <button
                type="button"
                onClick={() => navigate("/categories")}
                className="w-full border-t border-border/60 py-3 text-primary text-xs font-bold flex items-center justify-center gap-1.5 active:bg-primary/5"
              >
                <Plus className="w-4 h-4" /> Add more services or tests
              </button>
            )}
          </section>
        )}

        {/* Patient */}
        <section className="bg-card rounded-2xl border border-border/70 shadow-sm p-4">
          <h3 className="text-sm font-bold text-foreground">Who is this for?</h3>

          <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-0.5">
            {[{ id: "self" as string, label: "You" }, ...familyMembers.map((m) => ({ id: m.id, label: m.fullName }))].map((member) => {
              const active = selectedMemberId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => pickMember(member.id)}
                  className={`shrink-0 rounded-full pl-1 pr-3.5 py-1 text-xs font-bold border flex items-center gap-2 transition-colors ${
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border/70"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                    {member.id === "self" ? <UserIcon className="w-3.5 h-3.5" /> : initials(member.label)}
                  </span>
                  <span className="max-w-[110px] truncate">{member.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => navigate("/add-family-member", { state: { returnTo: "/cart" } })}
              className="shrink-0 rounded-full px-3.5 py-1 text-xs font-bold border border-dashed border-primary/50 text-primary flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {showPatientForm ? (
            <div className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="patient_name" className="text-xs font-semibold text-muted-foreground">Full name</Label>
                <Input
                  id="patient_name"
                  placeholder="Enter full name"
                  maxLength={80} value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className={fieldClass(!patientName.trim())}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="patient_age" className="text-xs font-semibold text-muted-foreground">Age</Label>
                  <Input
                    id="patient_age"
                    placeholder="Years"
                    value={patientAge}
                    onChange={(e) => setPatientAge(sanitizeAge(e.target.value))}
                    className={fieldClass(!/^\d{1,3}$/.test(patientAge) || Number(patientAge) <= 0)}
                    maxLength={3}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="patient_gender" className="text-xs font-semibold text-muted-foreground">Gender</Label>
                  <Select value={patientGender} onValueChange={setPatientGender}>
                    <SelectTrigger id="patient_gender" className={fieldClass(!patientGender)}>
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
              <div className="space-y-1.5">
                <Label htmlFor="patient_phone" className="text-xs font-semibold text-muted-foreground">Phone number</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">+91</span>
                  <Input
                    id="patient_phone"
                    placeholder="10-digit number"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(sanitizePhone(e.target.value))}
                    className={`${fieldClass(!/^\d{10}$/.test(patientPhone))} pl-12`}
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                {patientPhone.length > 0 && !/^\d{10}$/.test(patientPhone) && (
                  <p className="text-[11px] font-semibold text-destructive">Must be exactly 10 digits</p>
                )}
              </div>
              {patientDetailsValid && isMemberDetailsExpanded && (
                <Button type="button" variant="outline" className="w-full h-10 rounded-xl" onClick={() => setIsMemberDetailsExpanded(false)}>
                  <Check className="w-4 h-4 mr-1.5" /> Done
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-muted/50 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                {initials(patientName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{patientName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {patientAge} yrs · {patientGender} · +91 {patientPhone}
                </p>
              </div>
              <button
                type="button"
                aria-label="Edit patient details"
                onClick={() => setIsMemberDetailsExpanded(true)}
                className="w-8 h-8 rounded-full text-primary flex items-center justify-center shrink-0 active:bg-primary/10"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        {/* Collection Address */}
        <section className="bg-card rounded-2xl border border-border/70 shadow-sm p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Collection address</h3>
            {servicePincode && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Lock className="h-3 w-3" /> PIN {servicePincode}</span>
            )}
          </div>

          {addressLoading ? (
            <Skeleton className="h-16 w-full rounded-xl mt-3" />
          ) : addressFormOpen ? (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5 mt-3">
              <p className="text-xs font-bold text-foreground">{editingAddressId ? "Edit collection address" : "Enter collection address"}</p>
              <Select value={addressForm.type} onValueChange={(type) => setAddressForm((current) => ({ ...current, type }))}>
                <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Home">Home</SelectItem><SelectItem value="Office">Office</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
              </Select>
              <Input maxLength={150} value={addressForm.address_line1} onChange={(event) => setAddressForm((current) => ({ ...current, address_line1: event.target.value }))} placeholder="House/Flat No., Building, Street *" className="bg-background" />
              <Input maxLength={150} value={addressForm.address_line2} onChange={(event) => setAddressForm((current) => ({ ...current, address_line2: event.target.value }))} placeholder="Landmark, Area (optional)" className="bg-background" />
              <div className="grid grid-cols-2 gap-2">
                <Input maxLength={60} value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} placeholder="City *" className="bg-background" />
                <Input maxLength={60} value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} placeholder="State *" className="bg-background" />
              </div>
              <div className="flex gap-2">
                {savedAddresses.length > 0 && <Button type="button" variant="outline" className="flex-1" disabled={addressSaving} onClick={() => setAddressFormOpen(false)}>Cancel</Button>}
                <Button type="button" className="flex-1" disabled={addressSaving || !servicePincode} onClick={saveCollectionAddress}>
                  {addressSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Address
                </Button>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">The PIN is locked during this booking. Change your service location from Home before starting another booking.</p>
            </div>
          ) : (
            (() => {
              const addr =
                savedAddresses.find((a) => a.id === selectedAddressId) ??
                savedAddresses.find((a) => a.is_default) ??
                savedAddresses[0];
              if (!addr) return null;
              const AddressIcon = addressIcon(addr.type);
              return (
                <>
                  <div className="mt-3 rounded-xl bg-muted/50 p-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <AddressIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{addr.type || "Home"}</span>
                        {addr.is_default && (
                          <Badge variant="soft" className="text-[10px] bg-primary/15 text-primary font-bold px-1.5 py-0">Default</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{formatAddress(addr)}</p>
                    </div>
                    <button type="button" aria-label="Edit collection address" onClick={() => openEditAddressForm(addr)} className="w-8 h-8 rounded-full text-primary flex items-center justify-center shrink-0 active:bg-primary/10"><Pencil className="w-4 h-4" /></button>
                  </div>
                  {savedAddresses.length > 1 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {savedAddresses.map((address) => (
                        <Button key={address.id} type="button" size="sm" className="rounded-full h-8" variant={address.id === addr.id ? "default" : "outline"} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedAddressId(address.id); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedAddressId(address.id); }}>{address.type || "Address"}</Button>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={openNewAddressForm} className="mt-2 text-xs font-bold text-primary flex items-center gap-1 py-1.5"><Plus className="w-3.5 h-3.5" /> Add another address for this PIN</button>
                </>
              );
            })()
          )}
        </section>

        {/* Upload Prescription Tile */}
        <PrescriptionUpload
          ref={prescriptionUploadRef}
          value={prescription}
          onChange={setPrescription}
          userId={supabaseUserId}
          requiredFor={prescriptionTests}
        />
      </div>

      {/* Checkout bar, always in reach */}
      <div className="sticky bottom-0 bg-card border-t border-border/60 px-4 pt-3 safe-area-bottom z-40">
        <div className="flex items-center gap-4 pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground">
              Total · {items.length} {items.length === 1 ? "item" : "items"}
            </p>
            <p className="text-xl font-black text-foreground tabular-nums leading-tight">₹{cartTotal}</p>
          </div>
          <Button
            size="lg"
            className="flex-1 h-12 rounded-xl font-bold text-base shadow-md shadow-primary/20"
            onClick={handleCheckout}
            disabled={isCheckingOut || addressLoading || (items.length > 0 && items.some(i => i.labId) && !currentLabId)}
          >
            Checkout
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default CartScreen;
