import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, ShoppingCart, Upload, FileImage, X, Check, Building2, UserPlus, Plus, MapPin, ChevronRight } from "lucide-react";
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
import AddFamilyMemberDialog from "@/components/AddFamilyMemberDialog";
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
  } catch {}
  return null;
};

const savePatientDetails = (details: any) => {
  try {
    sessionStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(details));
  } catch {}
};

const clearPatientDetails = () => {
  try {
    sessionStorage.removeItem(PATIENT_STORAGE_KEY);
  } catch {}
};

const CartScreen = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, subtotal, currentLabName, isLoading } = useCart();
  const { supabaseUserId } = useAuth();
  const { members: familyMembers, addMember } = useFamilyMembers();

  // Handle returning from AddFamilyMemberScreen
  const locationState = location.state as any;
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

  // Prescription upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMemberId === "self") {
      // Only reset if not loading from saved
      if (!saved?.patientName) {
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
  }, [selectedMemberId, familyMembers]);

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

  const handlePrescriptionSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      toast.error("Please upload a JPG/JPEG image only"); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB"); return;
    }
    setPrescriptionFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPrescriptionPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPrescription = async () => {
    if (!prescriptionFile || !supabaseUserId) { toast.error("Please select a prescription image"); return; }
    setUploadingPrescription(true);
    try {
      const fileExt = prescriptionFile.name.split('.').pop();
      const fileName = `${supabaseUserId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('prescriptions').upload(fileName, prescriptionFile);
      if (uploadError) throw uploadError;
      setPrescriptionUrl(fileName);
      toast.success("Prescription uploaded successfully!");
    } catch (error) {
      console.error("Error uploading prescription:", error);
      toast.error("Failed to upload prescription");
    } finally { setUploadingPrescription(false); }
  };

  const handleRemovePrescription = async () => {
    if (prescriptionUrl && supabaseUserId) {
      try {
        await supabase.storage.from('prescriptions').remove([prescriptionUrl]);
      } catch (error) { console.error("Error removing prescription:", error); }
    }
    setPrescriptionFile(null); setPrescriptionPreview(null); setPrescriptionUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatAddress = (addr: SavedAddress) => {
    const parts = [addr.address_line1];
    if (addr.address_line2) parts.push(addr.address_line2);
    if (addr.city) parts.push(addr.city);
    if (addr.pincode) parts.push(addr.pincode);
    return parts.join(", ");
  };

  const handleCheckout = () => {
    if (!isPatientInfoValid) {
      setShowValidation(true);
      toast.error("Please fill all required fields");
      return;
    }

    // Determine if the cart has a pre-selected lab (from vendor profile booking)
    const hasVendorLab = items.some((item) => item.labId && item.labName);

    navigate("/lab-selection", {
      state: {
        patientName: patientName.trim(),
        patientAge: patientAge ? Number(patientAge) : null,
        patientGender,
        patientPhone: patientPhone.trim(),
        addressId: selectedAddressId,
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

      <div className="px-4 pb-44">
        <h2 className="text-lg font-bold text-foreground mb-3">
          {items.reduce((acc, item) => acc + item.quantity, 0)} {items.reduce((acc, item) => acc + item.quantity, 0) === 1 ? "Test" : "Tests"} Added
        </h2>

        {/* Cart items */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center ml-3"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <button
          onClick={() => navigate("/categories")}
          className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-medium flex items-center justify-center gap-1.5 hover:border-primary/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add More Tests or Health Checks
        </button>

        {/* Patient details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Patient Details</h3>
            <button onClick={() => setShowAddMemberDialog(true)} className="flex items-center gap-1 text-xs font-medium text-primary">
              <UserPlus className="w-4 h-4" /> Add Member
            </button>
          </div>

          {familyMembers.length > 0 && (
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Select Patient</Label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedMemberId("self")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedMemberId === "self" ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border"}`}>
                  Self
                </button>
                {familyMembers.map((m) => (
                  <button key={m.id} onClick={() => setSelectedMemberId(m.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedMemberId === m.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border"}`}>
                    {m.fullName} ({m.relationship === "Other" ? m.customRelationship : m.relationship})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="patient_name">Full Name *</Label>
              <Input id="patient_name" placeholder="Enter full name" value={patientName} onChange={(e) => setPatientName(e.target.value)} className={`bg-muted border-0 rounded-xl ${validationBorder(patientName.trim().length > 0)}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="patient_age">Age *</Label>
                <Input id="patient_age" placeholder="Age" value={patientAge} onChange={(e) => setPatientAge(e.target.value.replace(/[^0-9]/g, ""))} className={`bg-muted border-0 rounded-xl ${validationBorder(/^\d{1,3}$/.test(patientAge) && Number(patientAge) > 0 && Number(patientAge) <= 120)}`} maxLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patient_gender">Gender *</Label>
                <Select value={patientGender} onValueChange={setPatientGender}>
                  <SelectTrigger className={`bg-muted border-0 rounded-xl ${validationBorder(patientGender.trim().length > 0)}`}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient_phone">Patient Phone *</Label>
              <div className="flex items-center gap-2">
                <span className="flex h-10 items-center rounded-xl bg-muted px-3 text-sm font-medium text-muted-foreground select-none">+91</span>
                <Input id="patient_phone" placeholder="10-digit number" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value.replace(/[^0-9]/g, ""))} className={`bg-muted border-0 rounded-xl flex-1 ${validationBorder(/^\d{10}$/.test(patientPhone))}`} maxLength={10} />
              </div>
            </div>
          </div>
        </motion.div>

        <AddFamilyMemberDialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog} onAdd={addMember} />

        {/* Upload Prescription */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <FileImage className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Upload Prescription</h3>
            <Badge variant="soft" className="text-xs">Optional</Badge>
          </div>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,image/jpeg" onChange={handlePrescriptionSelect} className="hidden" />
          {!prescriptionPreview ? (
            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-card rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors p-4">
              <div className="flex flex-col items-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Upload Prescription Image</p>
                <p className="text-xs text-muted-foreground mt-1">JPG format only • Max 5MB</p>
              </div>
            </button>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                  <img src={prescriptionPreview} alt="Prescription preview" className="w-full h-full object-cover" />
                  {prescriptionUrl && (
                    <div className="absolute inset-0 bg-success/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-success" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{prescriptionFile?.name || "Prescription"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{prescriptionFile ? `${(prescriptionFile.size / 1024).toFixed(1)} KB` : ""}</p>
                  {prescriptionUrl ? (
                    <Badge variant="softSuccess" className="mt-2">Uploaded</Badge>
                  ) : (
                    <Button size="sm" variant="soft" className="mt-2 h-7 text-xs" onClick={handleUploadPrescription} disabled={uploadingPrescription}>
                      {uploadingPrescription ? "Uploading..." : "Upload"}
                    </Button>
                  )}
                </div>
                <button onClick={handleRemovePrescription} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Collection Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Collection Address *</h3>
            </div>
            <button onClick={() => navigate("/saved-addresses")} className="text-xs font-medium text-primary flex items-center gap-0.5">
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {addressLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : savedAddresses.length === 0 ? (
            <button
              onClick={() => navigate("/saved-addresses")}
              className={`w-full bg-card rounded-2xl border-2 border-dashed transition-colors p-4 ${showValidation && !selectedAddressId ? "border-destructive" : "border-primary/30 hover:border-primary/50"}`}
            >
              <div className="flex flex-col items-center py-2">
                <MapPin className="w-8 h-8 text-primary mb-2" />
                <p className="text-sm font-medium text-foreground">Add Collection Address</p>
                <p className="text-xs text-muted-foreground mt-1">Tap to add your address</p>
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`w-full text-left bg-card rounded-xl border p-3 transition-all ${
                    selectedAddressId === addr.id
                      ? "ring-2 ring-primary border-primary"
                      : showValidation && !selectedAddressId
                      ? "border-destructive"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{addr.type || "Home"}</span>
                        {addr.is_default && <Badge variant="soft" className="text-[10px] px-1.5 py-0">Default</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{formatAddress(addr)}</p>
                    </div>
                    {selectedAddressId === addr.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom CTA — full width checkout */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        className="fixed left-0 right-0 max-w-[430px] mx-auto bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 z-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <Button
          variant="hero"
          className="w-full"
          size="lg"
          onClick={handleCheckout}
        >
          Checkout
        </Button>
      </motion.div>
    </MobileLayout>
  );
};

export default CartScreen;