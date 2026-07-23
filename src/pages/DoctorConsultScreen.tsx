import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Stethoscope } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";

// Consultation specific types and components
import { ConsultationFlowState, initialConsultationState, Doctor } from "@/types/consultation";
import { ConsultationTypeStep } from "@/components/consultation/ConsultationTypeStep";
import { OfflineFlow } from "@/components/consultation/OfflineFlow";
import { OnlineFlow } from "@/components/consultation/OnlineFlow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DoctorConsultScreen = () => {
  const navigate = useNavigate();
  const { addToCart, pendingItem, confirmReplace, cancelReplace } = useCart();
  
  // State machine
  const [state, setState] = useState<ConsultationFlowState>(() => {
    const saved = sessionStorage.getItem("consultationState");
    return saved ? JSON.parse(saved) : initialConsultationState;
  });
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  useEffect(() => {
    sessionStorage.setItem("consultationState", JSON.stringify(state));
  }, [state]);

  // Fetch mock doctors (using same logic as old page but simplified for demo)
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(`doctor-directory?_ts=${Date.now()}`, { method: "GET" });
        if (!error && data) {
          const list = Array.isArray(data) ? data : Array.isArray(data?.doctors) ? data.doctors : [];
          if (list.length > 0) setDoctors(list);
        }
      } catch (e) {
        // Mock fallback if function fails
        setDoctors([
          { id: "1", name: "Dr. Priya Sharma", specialty: "General Physician", experience: 12, rating: 4.9, reviews: 1240, available: true, nextSlot: "Available now", videoCallFee: 299, audioCallFee: 199, physicalCallFee: 499, qualification: "MBBS, MD" },
          { id: "2", name: "Dr. Rajesh Kumar", specialty: "Internal Medicine", experience: 15, rating: 4.8, reviews: 980, available: true, nextSlot: "In 15 mins", videoCallFee: 399, audioCallFee: 299, physicalCallFee: 599, qualification: "MBBS, MD" }
        ]);
      }
    };
    fetchDoctors();
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
    
    const success = addToCart({
      id: `doc-${type}-${doctor.id}`,
      name: `${typeLabel} with ${doctor.name}`,
      price: fee,
      labId: "doctor-service",
      labName: "HealthSwift Medical Care",
      vendorId: "generic-service",
    });
    
    if (success) {
      toast.success(`${typeLabel} added to cart`);
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
          
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
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
        {/* Step 1: Choose Type */}
        {state.currentStep === 1 && (
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
          />
        )}
      </div>

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
