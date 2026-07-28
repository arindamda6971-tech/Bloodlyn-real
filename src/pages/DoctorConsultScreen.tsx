import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Stethoscope, Users, Plus, Heart, User, RefreshCw } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyMembers, type FamilyMember } from "@/hooks/useFamilyMembers";
import AddFamilyMemberDialog from "@/components/AddFamilyMemberDialog";

// Consultation specific types and components
import { ConsultationFlowState, initialConsultationState, Doctor } from "@/types/consultation";
import { ConsultationTypeStep } from "@/components/consultation/ConsultationTypeStep";
import { OfflineFlow } from "@/components/consultation/OfflineFlow";
import { OnlineFlow } from "@/components/consultation/OnlineFlow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DoctorConsultScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToCart, pendingItem, confirmReplace, cancelReplace } = useCart();
  
  // State machine with deep safe restoration
  const [state, setState] = useState<ConsultationFlowState>(() => {
    try {
      if (location.state?.reset) {
        sessionStorage.removeItem("consultationState");
        return initialConsultationState;
      }
      const saved = sessionStorage.getItem("consultationState");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed.currentStep === "number" &&
          (parsed.type === "offline" || parsed.type === "online" || parsed.currentStep === 1)
        ) {
          return {
            ...initialConsultationState,
            ...parsed,
            offlineState: {
              ...initialConsultationState.offlineState,
              ...(parsed.offlineState || {}),
              filters: {
                ...initialConsultationState.offlineState.filters,
                ...((parsed.offlineState && parsed.offlineState.filters) || {}),
              },
            },
            onlineState: {
              ...initialConsultationState.onlineState,
              ...(parsed.onlineState || {}),
              basicInfo: {
                ...initialConsultationState.onlineState.basicInfo,
                ...((parsed.onlineState && parsed.onlineState.basicInfo) || {}),
              },
              filters: {
                ...initialConsultationState.onlineState.filters,
                ...((parsed.onlineState && parsed.onlineState.filters) || {}),
              },
            },
          };
        }
      }
    } catch (e) {
      console.error("Failed to restore consultationState", e);
      sessionStorage.removeItem("consultationState");
    }
    return initialConsultationState;
  });
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Family Members System
  const { members: familyMembers, addMember } = useFamilyMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string | "self">("self");
  const [showAddFamilyDialog, setShowAddFamilyDialog] = useState(false);
  const [selfProfile, setSelfProfile] = useState<{ name: string; age: string; gender: string; mobile: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, gender, date_of_birth")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const dob = data.date_of_birth ? new Date(data.date_of_birth) : null;
        const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
        setSelfProfile({
          name: data.full_name || "Self",
          age: age && age > 0 ? String(age) : "",
          gender: data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : "",
          mobile: (data.phone || "").replace(/\D/g, "").slice(-10),
        });
      }
    })();
  }, [user]);

  const handleAddFamilyMember = async (memberData: Omit<FamilyMember, "id">) => {
    const newMember = await addMember(memberData);
    if (newMember) {
      setSelectedMemberId(newMember.id);
      toast.success(`Added ${newMember.fullName} as family member`);
    }
  };

  const getSelectedPatientName = () => {
    if (selectedMemberId === "self") {
      return selfProfile?.name || "Self";
    }
    const member = familyMembers.find(m => m.id === selectedMemberId);
    return member ? `${member.fullName} (${member.relationship})` : "Patient";
  };
  
  useEffect(() => {
    sessionStorage.setItem("consultationState", JSON.stringify(state));
  }, [state]);

  // Fetch doctors from doctor-directory edge function + Supabase profiles + fallback list
  useEffect(() => {
    let cancelled = false;
    const defaultList: Doctor[] = [
      { id: "doc-1", name: "Dr. Priya Sharma", specialty: "General Physician", qualification: "MBBS, MD (General Medicine)", experience: 12, rating: 4.9, reviews: 1240, available: true, nextSlot: "Available today", videoCallFee: 299, audioCallFee: 199, physicalCallFee: 499, hospitalName: "Apollo Health Clinic", clinicAddress: "12/A Park Street, Kolkata - 700016", pincode: "700016", service_pincodes: ["700016", "700001", "700019", "700020", "110001"], gender: "Female", languages: ["English", "Hindi", "Bengali"] },
      { id: "doc-2", name: "Dr. Rajesh Kumar", specialty: "Internal Medicine", qualification: "MBBS, MD", experience: 15, rating: 4.8, reviews: 980, available: true, nextSlot: "Available today", videoCallFee: 399, audioCallFee: 299, physicalCallFee: 599, hospitalName: "Fortis Care Center", clinicAddress: "45 Salt Lake Sector 1, Kolkata - 700064", pincode: "700064", service_pincodes: ["700064", "700091", "700001", "110001"], gender: "Male", languages: ["English", "Hindi"] },
      { id: "doc-3", name: "Dr. Ananya Roy", specialty: "Dermatologist", qualification: "MBBS, MD (Dermatology)", experience: 8, rating: 4.9, reviews: 620, available: true, nextSlot: "Available today", videoCallFee: 499, audioCallFee: 399, physicalCallFee: 699, hospitalName: "Skin & Care Aesthetics", clinicAddress: "88 Camac Street, Kolkata - 700017", pincode: "700017", service_pincodes: ["700017", "700001", "700016", "110001"], gender: "Female", languages: ["English", "Bengali"] },
      { id: "doc-4", name: "Dr. Vikramaditya Sen", specialty: "Cardiologist", qualification: "MBBS, MD, DM (Cardiology)", experience: 20, rating: 5.0, reviews: 2150, available: true, nextSlot: "Available today", videoCallFee: 799, audioCallFee: 599, physicalCallFee: 999, hospitalName: "Ruby Cardiac Clinic", clinicAddress: "EM Bypass, Kasba, Kolkata - 700107", pincode: "700107", service_pincodes: ["700107", "700001", "700019", "110001"], gender: "Male", languages: ["English", "Hindi", "Bengali"] },
      { id: "doc-5", name: "Dr. Sneha Verma", specialty: "Pediatrician", qualification: "MBBS, DCH, MD (Pediatrics)", experience: 11, rating: 4.9, reviews: 840, available: true, nextSlot: "Available today", videoCallFee: 349, audioCallFee: 249, physicalCallFee: 499, hospitalName: "Little Stars Children's Clinic", clinicAddress: "23 Ballygunge Circular Rd, Kolkata - 700019", pincode: "700019", service_pincodes: ["700019", "700001", "700029", "110001"], gender: "Female", languages: ["English", "Hindi"] },
      { id: "doc-6", name: "Dr. Sourav Banerjee", specialty: "Orthopedic", qualification: "MBBS, MS (Orthopedics)", experience: 14, rating: 4.8, reviews: 730, available: true, nextSlot: "Available today", videoCallFee: 450, audioCallFee: 350, physicalCallFee: 650, hospitalName: "Joint & Bone Institute", clinicAddress: "14 Gariahat Road, Kolkata - 700019", pincode: "700019", service_pincodes: ["700019", "700001", "700032"], gender: "Male", languages: ["English", "Bengali"] },
    ];

    const fetchDoctors = async () => {
      let edgeDocs: Doctor[] = [];
      let dbDocs: Doctor[] = [];

      try {
        const { data, error } = await supabase.functions.invoke(`doctor-directory?_ts=${Date.now()}`, { method: "GET" });
        if (!error && data) {
          const raw = Array.isArray(data) ? data : Array.isArray(data?.doctors) ? data.doctors : [];
          edgeDocs = raw.map((d: any) => ({
            id: String(d.id || d.user_id || Math.random()),
            name: d.name || d.full_name || "Dr. Specialist",
            specialty: d.specialty || d.specialization || "General Physician",
            qualification: d.qualification || "MBBS, MD",
            experience: d.experience ?? d.experience_years ?? 10,
            rating: d.rating ?? 4.9,
            reviews: d.reviews ?? d.reviews_count ?? 150,
            available: d.available !== false,
            nextSlot: "Available today",
            videoCallFee: d.videoCallFee ?? d.video_call_fee ?? 299,
            audioCallFee: d.audioCallFee ?? d.audio_call_fee ?? 199,
            physicalCallFee: d.physicalCallFee ?? d.in_clinic_fee ?? d.consultation_fee ?? 499,
            image: d.image || d.photo_url || undefined,
            hospitalName: d.hospitalName || d.clinic_name || "HealthSwift Clinic",
            clinicAddress: d.clinicAddress || d.clinic_address || "Main Road Clinic",
            pincode: d.pincode || (d.clinic_address ? (d.clinic_address.match(/\b\d{6}\b/)?.[0] || "") : ""),
            service_pincodes: d.service_pincodes || (d.pincode ? [d.pincode] : []),
            gender: d.gender || "Any",
            languages: d.languages || ["English", "Hindi"],
          }));
        }
      } catch (e) {
        console.warn("doctor-directory edge function fallback:", e);
      }

      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("*")
          .not("specialization", "is", null);

        if (profs && profs.length > 0) {
          dbDocs = profs.map((p: any) => ({
            id: String(p.user_id || p.id),
            name: p.full_name || "Dr. Partner Specialist",
            specialty: p.specialization || "General Physician",
            qualification: p.qualification || "MBBS, MD",
            experience: p.experience_years ?? 10,
            rating: p.rating ?? 4.9,
            reviews: p.reviews_count ?? 95,
            available: true,
            nextSlot: "Available today",
            videoCallFee: p.video_call_fee ?? p.consultation_fee ?? 299,
            audioCallFee: p.audio_call_fee ?? 199,
            physicalCallFee: p.in_clinic_fee ?? p.consultation_fee ?? 499,
            image: p.photo_url || undefined,
            hospitalName: p.clinic_name || "HealthSwift Partner Clinic",
            clinicAddress: p.clinic_address || "Clinic Address",
            pincode: p.pincode || (p.clinic_address ? (p.clinic_address.match(/\b\d{6}\b/)?.[0] || "") : ""),
            service_pincodes: Array.isArray(p.service_pincodes) ? p.service_pincodes : (p.pincode ? [p.pincode] : []),
            gender: p.gender || "Any",
            languages: ["English", "Hindi"],
          }));
        }
      } catch (e) {
        console.warn("DB profiles fetch fallback:", e);
      }

      if (cancelled) return;

      // Merge edgeDocs, dbDocs, and defaultList without duplicates by name/id
      const mergedMap = new Map<string, Doctor>();
      [...dbDocs, ...edgeDocs, ...defaultList].forEach((doc) => {
        const key = doc.name.toLowerCase().trim();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, doc);
        }
      });

      setDoctors(Array.from(mergedMap.values()));
    };

    fetchDoctors();
    return () => { cancelled = true; };
  }, []);

  const updateState = (updates: Partial<ConsultationFlowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const updateOfflineState = (updates: Partial<ConsultationFlowState["offlineState"]>) => {
    setState(prev => ({ ...prev, offlineState: { ...prev.offlineState, ...updates } }));
  };

  const updateOnlineState = (updates: Partial<ConsultationFlowState["onlineState"]>) => {
    setState(prev => ({ ...prev, onlineState: { ...prev.onlineState, ...updates } }));
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      updateState({ currentStep: state.currentStep - 1 });
    } else {
      navigate(-1);
    }
  };

  const handleBook = (doctor: Doctor, type: "video" | "audio" | "physical") => {
    const fee = type === "video" ? doctor.videoCallFee : type === "audio" ? doctor.audioCallFee : doctor.physicalCallFee;
    const typeLabel = type === "video" ? "Video Call" : type === "audio" ? "Audio Call" : "Physical Appointment";
    const patientName = getSelectedPatientName();
    
    const success = addToCart({
      id: `doc-${type}-${doctor.id}`,
      name: `${typeLabel} with ${doctor.name} (${patientName})`,
      price: fee,
      labId: "doctor-service",
      labName: "HealthSwift Medical Care",
      vendorId: "generic-service",
    });
    
    if (success) {
      toast.success(`${typeLabel} for ${patientName} added to cart`);
      navigate("/cart");
    }
  };

  const handleConfirmReplace = () => {
    confirmReplace(() => navigate("/cart"));
    toast.success("Cart replaced with new booking");
  };

  return (
    <MobileLayout showNav={false}>
      {/* Dynamic Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40 pb-2">
        <div className="flex items-center justify-between p-4 pb-2">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-xl active:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="font-bold text-base tracking-tight text-foreground">
              {state.type === "offline" ? "Clinic Visit" : state.type === "online" ? "Online Consult" : "Book Doctor"}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Step {state.currentStep} of {state.totalSteps}
            </p>
          </div>
          
          <button
            onClick={() => {
              sessionStorage.removeItem("consultationState");
              setState(initialConsultationState);
              toast.info("Reset doctor consultation");
            }}
            title="Start New Booking"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 mt-2">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(state.currentStep / state.totalSteps) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-32">
        {/* Step 1: Choose Type (with fallback if state.type is missing) */}
        {(state.currentStep === 1 || !state.type) && (
          <ConsultationTypeStep 
            onSelect={(type) => {
              updateState({ 
                type, 
                currentStep: 2, 
                totalSteps: type === "offline" ? 5 : 6 
              });
            }} 
          />
        )}

        {/* Offline Flow Steps (2-5) */}
        {state.type === "offline" && state.currentStep > 1 && (
          <OfflineFlow 
            state={state} 
            updateState={updateState} 
            updateOfflineState={updateOfflineState} 
            doctors={doctors}
            onBook={handleBook}
            familyMembers={familyMembers}
            selectedMemberId={selectedMemberId}
            setSelectedMemberId={setSelectedMemberId}
            selfProfile={selfProfile}
            onOpenAddDialog={() => setShowAddFamilyDialog(true)}
          />
        )}

        {/* Online Flow Steps (2-6) */}
        {state.type === "online" && state.currentStep > 1 && (
          <OnlineFlow 
            state={state} 
            updateState={updateState} 
            updateOnlineState={updateOnlineState} 
            doctors={doctors}
            onBook={handleBook}
            familyMembers={familyMembers}
            selectedMemberId={selectedMemberId}
            setSelectedMemberId={setSelectedMemberId}
            selfProfile={selfProfile}
            onOpenAddDialog={() => setShowAddFamilyDialog(true)}
          />
        )}
      </div>

      {/* Add Family Member Modal */}
      <AddFamilyMemberDialog
        open={showAddFamilyDialog}
        onOpenChange={setShowAddFamilyDialog}
        onAdd={handleAddFamilyMember}
        existingMembers={familyMembers}
      />

      {/* Cart Conflict Dialog */}
      <AlertDialog open={!!pendingItem} onOpenChange={(open) => !open && cancelReplace()}>
        <AlertDialogContent className="max-w-[90%] rounded-3xl border border-border bg-card shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Replace Cart Item?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              You already have <span className="font-bold text-foreground">{pendingItem?.existingLabName}</span> in your cart.
              You can only book one specialized appointment/test at a time. Do you want to replace it with this booking?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-2xl h-11 text-xs font-bold" onClick={cancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="flex-1 rounded-2xl h-11 text-xs font-bold bg-primary hover:bg-primary/90" onClick={handleConfirmReplace}>Replace Cart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default DoctorConsultScreen;
