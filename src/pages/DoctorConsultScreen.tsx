import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  Shield,
  Stethoscope,
  Activity,
  Bone,
  Brain,
  Heart,
  User,
  MapPin,
  Sparkles,
  Award,
  CheckCircle2,
  Video,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Doctor = {
  id: string | number;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  reviews: number;
  available: boolean;
  nextSlot: string;
  videoCallFee: number;
  audioCallFee: number;
  physicalCallFee: number;
  qualification: string;
  image?: string;
};

const FALLBACK_DOCTORS: Doctor[] = [
  {
    id: "fallback-1",
    name: "Dr. Priya Sharma",
    specialty: "General Physician",
    experience: 12,
    rating: 4.9,
    reviews: 1240,
    available: true,
    nextSlot: "Available now",
    videoCallFee: 299,
    audioCallFee: 199,
    physicalCallFee: 499,
    qualification: "MBBS, MD (Medicine)",
  },
  {
    id: "fallback-2",
    name: "Dr. Rajesh Kumar",
    specialty: "Internal Medicine",
    experience: 15,
    rating: 4.8,
    reviews: 980,
    available: true,
    nextSlot: "In 15 mins",
    videoCallFee: 399,
    audioCallFee: 299,
    physicalCallFee: 599,
    qualification: "MBBS, MD (Internal Medicine)",
  },
];


const specializations = [
  { id: "gp", icon: Stethoscope, label: "General Physician", color: "bg-primary/10 text-primary border-primary/20" },
  { id: "med", icon: User, label: "Internal Medicine", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: "peds", icon: Activity, label: "Pediatrics", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { id: "ortho", icon: Bone, label: "Orthopaedic", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "dental", icon: User, label: "Dental", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { id: "cardio", icon: Heart, label: "Cardiology", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  { id: "derm", icon: Activity, label: "Dermatology", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "neuro", icon: Brain, label: "Neurology", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
];

const DoctorConsultScreen = () => {
  const navigate = useNavigate();
  const { addToCart, pendingItem, confirmReplace, cancelReplace } = useCart();
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>(FALLBACK_DOCTORS);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("doctor-directory", {
          method: "GET",
        });
        if (cancelled) return;
        if (error) throw error;
        const list: Doctor[] | undefined = Array.isArray(data)
          ? data
          : Array.isArray(data?.doctors)
            ? data.doctors
            : undefined;
        if (list && list.length > 0) setDoctors(list);
      } catch (e) {
        console.warn("doctor-directory fetch failed, using fallback:", e);
      } finally {
        if (!cancelled) setLoadingDoctors(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredDoctors = selectedSpecialization
    ? doctors.filter((d) => {
        if (selectedSpecialization === "gp") return /General/i.test(d.specialty);
        if (selectedSpecialization === "med") return /Internal|Medicine/i.test(d.specialty);
        if (selectedSpecialization === "peds") return /Pediatr|Paediatr/i.test(d.specialty);
        if (selectedSpecialization === "ortho") return /Ortho/i.test(d.specialty);
        if (selectedSpecialization === "dental") return /Dent|Dental|Oral/i.test(d.specialty);
        if (selectedSpecialization === "cardio") return /Cardio|Cardiolog/i.test(d.specialty);
        if (selectedSpecialization === "derm") return /Derm/i.test(d.specialty);
        if (selectedSpecialization === "neuro") return /Neuro/i.test(d.specialty);
        return true;
      })
    : doctors;


  const selectedSpecLabel = selectedSpecialization
    ? specializations.find((s) => s.id === selectedSpecialization)?.label ?? selectedSpecialization
    : null;

  const handleConfirmReplace = () => {
    confirmReplace(() => navigate("/cart"));
    toast.success("Cart replaced with new booking");
  };

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Book a Doctor" />

      <div className="px-4 pb-32 pt-1">
        {/* Premium Title Header */}
        <PremiumPageHeader
          title="Advanced Consultation"
          subtitle="Connect with certified specialists"
          icon={Stethoscope}
          accent="from-primary via-primary to-blue-600"
        />

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-[0_10px_30px_-10px_rgba(30,27,75,0.5)] relative overflow-hidden border border-white/10"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold tracking-wide uppercase mb-3 text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Medical Excellence</span>
            </div>
            <h2 className="text-xl font-black tracking-tight leading-snug">
              Get Expert Medical Advice,<br />Targeted to Your Health
            </h2>
            <p className="text-xs text-slate-300 mt-2 max-w-[90%] leading-relaxed">
              Consult verified medical doctors for thorough evaluations, precise diagnostics, and dedicated care.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className="flex items-center gap-1.5 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>MBBS Verified</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Physical Appointments</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Conflict Alert Dialog */}
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
              <AlertDialogCancel className="flex-1 mt-0 rounded-2xl h-11 text-xs font-bold" onClick={cancelReplace}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction className="flex-1 rounded-2xl h-11 text-xs font-bold bg-primary hover:bg-primary/90" onClick={handleConfirmReplace}>
                Replace Cart
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Specializations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <h3 className="text-sm font-bold text-foreground mb-3 tracking-wide uppercase opacity-90 flex items-center gap-2">
            <span>Specializations</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary lowercase normal-case">filter</span>
          </h3>
          <div className="grid grid-cols-4 gap-2.5">
            {specializations.map((spec) => {
              const isSelected = selectedSpecialization === spec.id;
              return (
                <button
                  key={spec.id}
                  onClick={() => setSelectedSpecialization(isSelected ? null : spec.id)}
                  className={`py-3.5 px-2 rounded-2xl flex flex-col items-center gap-2.5 border transition-all duration-300 active:scale-95 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_8px_20px_-6px_hsl(var(--primary)/0.5)] scale-[1.02]"
                      : `${spec.color} bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-sm`
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-background/80 shadow-sm'}`}>
                    <spec.icon className={`w-5 h-5 ${isSelected ? 'text-white' : ''}`} />
                  </div>
                  <span className="text-[11px] font-bold text-center leading-tight tracking-tight">{spec.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Available doctors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-7"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground tracking-wide uppercase opacity-90">
              Available Doctors
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Doctor' : 'Doctors'}
            </span>
          </div>
          <div className="space-y-4">
            {filteredDoctors.length === 0 ? (
              <div className="p-6 rounded-3xl bg-muted/50 text-center border border-border">
                <p className="font-bold text-foreground">
                  {selectedSpecialization
                    ? `No ${selectedSpecLabel} doctors available right now.`
                    : "No doctors available right now."}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Try another specialization or check back later.</p>
              </div>
            ) : (
              filteredDoctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="p-5 rounded-3xl bg-card/90 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-300 group"
                >
                  {/* Doctor Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-blue-500/20 flex items-center justify-center flex-shrink-0 border border-primary/20 group-hover:scale-105 transition-transform duration-300">
                      <Stethoscope className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-base tracking-tight truncate group-hover:text-primary transition-colors">{doctor.name}</h4>
                      <p className="text-xs font-semibold text-primary line-clamp-1 mt-0.5">{doctor.specialty}</p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-1">{doctor.qualification}</p>
                    </div>
                  </div>

                  {/* Doctor Details Grid */}
                  <div className="grid grid-cols-3 gap-2 py-3.5 bg-muted/30 rounded-2xl border border-border/60 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground">{doctor.experience}y</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Experience</p>
                    </div>
                    <div className="text-center border-l border-r border-border/60">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-foreground">{doctor.rating}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">({doctor.reviews} reviews)</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Available</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">{doctor.nextSlot}</p>
                    </div>
                  </div>

                  {/* Booking Actions Single Row Blue Tiles */}
                  <div className="grid grid-cols-3 gap-2.5 mt-2">
                    {/* Video Consultation */}
                    <div
                      className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#f0f3ff] hover:bg-[#e6ebff] border border-blue-200 text-blue-950 transition-all active:scale-95 cursor-pointer shadow-sm group"
                      onClick={() => {
                        if (!doctor.available) {
                          toast.error("Doctor is currently offline", {
                            description: `Next available: ${doctor.nextSlot}`,
                          });
                          return;
                        }
                        const success = addToCart({
                          id: `doc-video-${doctor.id}`,
                          name: `Video Call with ${doctor.name}`,
                          price: doctor.videoCallFee,
                          labId: "doctor-service",
                          labName: "HealthSwift Medical Care",
                          vendorId: "generic-service",
                        });
                        if (success) {
                          toast.success(`Video Call with ${doctor.name} added to cart`);
                          navigate("/cart");
                        }
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform">
                        <Video className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 tracking-tight text-center leading-tight">Video Call</span>
                      <span className="text-[11px] font-extrabold text-blue-600 mt-1 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-xs">₹{doctor.videoCallFee}</span>
                    </div>

                    {/* Audio Consultation */}
                    <div
                      className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#f0f3ff] hover:bg-[#e6ebff] border border-blue-200 text-blue-950 transition-all active:scale-95 cursor-pointer shadow-sm group"
                      onClick={() => {
                        if (!doctor.available) {
                          toast.error("Doctor is currently offline", {
                            description: `Next available: ${doctor.nextSlot}`,
                          });
                          return;
                        }
                        const success = addToCart({
                          id: `doc-audio-${doctor.id}`,
                          name: `Audio Call with ${doctor.name}`,
                          price: doctor.audioCallFee,
                          labId: "doctor-service",
                          labName: "HealthSwift Medical Care",
                          vendorId: "generic-service",
                        });
                        if (success) {
                          toast.success(`Audio Call with ${doctor.name} added to cart`);
                          navigate("/cart");
                        }
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform">
                        <Phone className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 tracking-tight text-center leading-tight">Audio Call</span>
                      <span className="text-[11px] font-extrabold text-blue-600 mt-1 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-xs">₹{doctor.audioCallFee}</span>
                    </div>

                    {/* Physical Appointment */}
                    <div
                      className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#f0f3ff] hover:bg-[#e6ebff] border border-blue-200 text-blue-950 transition-all active:scale-95 cursor-pointer shadow-sm group"
                      onClick={() => {
                        if (!doctor.available) {
                          toast.error("Doctor is currently offline", {
                            description: `Next available: ${doctor.nextSlot}`,
                          });
                          return;
                        }
                        const success = addToCart({
                          id: `doc-${doctor.id}`,
                          name: `Physical Appointment with ${doctor.name}`,
                          price: doctor.physicalCallFee,
                          labId: "doctor-service",
                          labName: "HealthSwift Medical Care",
                          vendorId: "generic-service",
                        });
                        if (success) {
                          toast.success(`Physical Appointment with ${doctor.name} added to cart`);
                          navigate("/cart");
                        }
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 tracking-tight text-center leading-tight">Physical</span>
                      <span className="text-[11px] font-extrabold text-blue-600 mt-1 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-xs">₹{doctor.physicalCallFee}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-7 p-5 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-500/20 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm tracking-wide uppercase opacity-90">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>Why Choose Our Doctors?</span>
          </h4>
          <ul className="space-y-2.5 text-xs text-foreground/80 font-medium">
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>All doctors are certified and experienced specialists</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Comprehensive clinical physical appointments</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Personalized health advice &amp; review of lab test results</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default DoctorConsultScreen;
