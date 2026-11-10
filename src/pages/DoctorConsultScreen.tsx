import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Stethoscope, Users, Plus, Heart, User, RefreshCw } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useAfterTransition } from "@/hooks/useAfterTransition";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyMembers, type FamilyMember } from "@/hooks/useFamilyMembers";
import AddFamilyMemberDialog from "@/components/AddFamilyMemberDialog";

// Consultation specific types and components
import { ConsultationFlowState, initialConsultationState, Doctor } from "@/types/consultation";
import { ConsultationTypeStep } from "@/components/consultation/ConsultationTypeStep";
import { OfflineFlow } from "@/components/consultation/OfflineFlow";
import { ServiceIntro } from "@/components/services/ServiceIntro";
import { OnlineFlow } from "@/components/consultation/OnlineFlow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DoctorConsultScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToCart, pendingItem, confirmReplace, cancelReplace } = useCart();
  const [showIntro, setShowIntro] = useState(true);
  
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

  // Doctors come only from the doctor-directory function: doctors the admin approved and
  // that are active in the partner portal. There is no sample list and no made-up rating:
  // a patient must never be able to book (and pay) a doctor who doesn't exist.
  // Start loading once the screen has slid in, so replies don't re-render it mid-slide.
  const afterSlide = useAfterTransition();
  useEffect(() => {
    if (!afterSlide) return;
    let cancelled = false;

    const fetchDoctors = async () => {
      let found: Doctor[] = [];
      try {
        const { data, error } = await supabase.functions.invoke(`doctor-directory?_ts=${Date.now()}`, { method: "GET" });
        if (!error && data) {
          const raw = Array.isArray(data) ? data : Array.isArray(data?.doctors) ? data.doctors : [];
          found = raw
            .filter((d: any) => d && (d.id || d.user_id) && (d.name || d.full_name))
            .map((d: any) => {
              const fee = Number(d.consultation_fee ?? 0) || 0;
              return {
                id: String(d.id || d.user_id),
                name: d.name || d.full_name,
                specialty: d.specialty || d.specialization || "General Physician",
                qualification: d.qualification || "",
                experience: Number(d.experience ?? d.experience_years ?? 0) || 0,
                rating: Number(d.rating ?? 0) || 0,
                reviews: Number(d.reviews ?? d.reviews_count ?? 0) || 0,
                available: d.available !== false,
                nextSlot: "See times",
                videoCallFee: Number(d.videoCallFee ?? d.video_call_fee ?? fee) || fee,
                audioCallFee: Number(d.audioCallFee ?? d.audio_call_fee ?? fee) || fee,
                physicalCallFee: Number(d.physicalCallFee ?? d.in_clinic_fee ?? fee) || fee,
                image: d.image || d.photo_url || undefined,
                hospitalName: d.hospitalName || d.clinic_name || "",
                clinicAddress: d.clinicAddress || d.clinic_address || "",
                pincode: d.pincode || (d.clinic_address ? (d.clinic_address.match(/\b\d{6}\b/)?.[0] || "") : ""),
                service_pincodes: d.service_pincodes || (d.pincode ? [d.pincode] : []),
                gender: d.gender || "Any",
                languages: d.languages || ["English", "Hindi"],
              } as Doctor;
            });
        }
      } catch (e) {
        console.warn("doctor-directory unavailable:", e);
      }

      if (cancelled) return;
      setDoctors(found);
    };

    fetchDoctors();
    return () => { cancelled = true; };
  }, [afterSlide]);

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
      labName: doctor.hospitalName || "BloodLyn Medical Care",
      vendorId: String(doctor.id),
      doctorId: String(doctor.id),
      doctorName: doctor.name,
      consultationType: type,
      patientName: patientName,
      symptoms: `${state.healthConcern || "Consultation"}${state.onlineState.basicInfo.bloodPressure ? ` | BP: ${state.onlineState.basicInfo.bloodPressure}` : ""}${state.onlineState.basicInfo.bloodSugar ? ` | Sugar: ${state.onlineState.basicInfo.bloodSugar}` : ""}${state.onlineState.basicInfo.medications ? ` | Note: ${state.onlineState.basicInfo.medications}` : ""}`,
    } as any);
    
    if (success) {
      toast.success(`${typeLabel} for ${patientName} added to cart`);
      navigate("/cart");
    }
  };

  const handleConfirmReplace = () => {
    confirmReplace(() => navigate("/cart"));
    toast.success("Cart replaced with new booking");
  };

  if (showIntro) {
    return <ServiceIntro serviceType="doctor" onProceed={() => setShowIntro(false)} />;
  }

  return (
    <MobileLayout showNav={false}>
      {/* Dynamic Header */}
      <div className="sticky top-0 z-50 bg-background/98 border-b border-border/40 pb-2">
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
          
          <div className="w-9 h-9" />
        </div>

        {/* Progress Bar */}
        <div className="px-4 mt-2">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary" data-initial={false} data-animate={{ width: `${(state.currentStep / state.totalSteps) * 100}%` }} data-transition={{ duration: 0.3, ease: "easeInOut" }}
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
                totalSteps: type === "offline" ? 5 : 6,
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
              You can only book one appointment or test at a time. Do you want to replace it with this booking?
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
