import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  Shield,
  Activity,
  Bone,
  Brain,
  Heart,
  Sparkles,
  Award,
  CheckCircle2,
  MapPin,
  MapPinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { ServiceIntro } from "@/components/services/ServiceIntro";
import { useAuth } from "@/hooks/useAuth";
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

const physiotherapists = [
  {
    id: 1,
    name: "Dr. Vikram Singh",
    specialty: "Sports Physiotherapy",
    experience: 10,
    rating: 4.9,
    reviews: 856,
    available: true,
    nextSlot: "Available now",
    videoCallFee: 399,
    audioCallFee: 299,
    qualification: "MPT (Sports), BPT",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Dr. Meera Gupta",
    specialty: "Orthopedic Rehabilitation",
    experience: 8,
    rating: 4.8,
    reviews: 642,
    available: true,
    nextSlot: "In 30 mins",
    videoCallFee: 349,
    audioCallFee: 249,
    qualification: "MPT (Ortho), MIAP",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Dr. Arjun Menon",
    specialty: "Neurological Physiotherapy",
    experience: 12,
    rating: 4.9,
    reviews: 978,
    available: false,
    nextSlot: "Tomorrow 11 AM",
    videoCallFee: 499,
    audioCallFee: 399,
    qualification: "MPT (Neuro), NABL Cert.",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 4,
    name: "Dr. Kavya Nair",
    specialty: "Cardiopulmonary Physio",
    experience: 7,
    rating: 4.7,
    reviews: 432,
    available: true,
    nextSlot: "In 1 hour",
    videoCallFee: 349,
    audioCallFee: 249,
    qualification: "MPT (Cardio), BPT",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
  },
];

const specializations = [
  { id: "sports", icon: Activity, label: "Sports Injury", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { id: "ortho", icon: Bone, label: "Orthopedic", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: "neuro", icon: Brain, label: "Neurological", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "cardio", icon: Heart, label: "Cardiopulmonary", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
];

const PhysioConsultScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const { addToCart, pendingItem, confirmReplace, cancelReplace } = useCart();
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const isServiceAvailable = false;

  const filteredPhysios = selectedSpecialization
    ? physiotherapists.filter((p) => {
        if (selectedSpecialization === "sports") return p.specialty.includes("Sports");
        if (selectedSpecialization === "ortho") return p.specialty.includes("Orthopedic");
        if (selectedSpecialization === "neuro") return p.specialty.includes("Neurological");
        if (selectedSpecialization === "cardio") return p.specialty.includes("Cardiopulmonary");
        return true;
      })
    : physiotherapists;

  const handleProceedToBook = (physio: typeof physiotherapists[0]) => {
    if (!user) {
      toast.error("Please login to book a session");
      navigate("/login");
      return;
    }

    const success = addToCart({
      id: `physio-${physio.id}`,
      name: `Home Physiotherapy with ${physio.name}`,
      price: physio.videoCallFee ?? physio.audioCallFee ?? 399,
      labId: "physio-service",
      labName: "BloodLyn Rehab Care",
      vendorId: "generic-service",
    });

    if (success) {
      toast.success(`Home Physiotherapy with ${physio.name} added to cart`);
      navigate("/cart");
    }
  };

  const handleConfirmReplace = () => {
    confirmReplace(() => navigate("/cart"));
    toast.success("Cart replaced with new booking");
  };

  if (showIntro) {
    return <ServiceIntro serviceType="physio" onProceed={() => setShowIntro(false)} />;
  }

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Physiotherapy" />

      <div className="px-4 pb-32 pt-1">
        {/* Premium Title Header */}
        <PremiumPageHeader
          title="Expert Physio Care"
          subtitle="Certified therapists at your doorstep"
          icon={Activity}
          accent="from-blue-600 via-indigo-600 to-purple-600"
        />

        {!isServiceAvailable ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center"
          >
            <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors duration-500" />
              <div className="relative w-28 h-28 rounded-[2.5rem] bg-card border border-border/50 shadow-2xl flex items-center justify-center rotate-3 hover:-rotate-3 transition-transform duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-[2.5rem]" />
                <MapPinOff className="w-12 h-12 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-3">
              Location Not Covered
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-[300px] mx-auto">
              We are actively expanding our network of certified physiotherapists. This service will be available in your area soon.
            </p>
            <div className="flex flex-col w-full gap-3 max-w-[280px]">
              <Button onClick={() => navigate(-1)} className="h-14 rounded-2xl font-bold text-[15px] shadow-lg shadow-primary/25">
                Explore Other Services
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
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
              <span>Premium Rehabilitation</span>
            </div>
            <h2 className="text-xl font-black tracking-tight leading-snug">
              Pain Relief &amp; Mobility,<br />Delivered at Home
            </h2>
            <p className="text-xs text-slate-300 mt-2 max-w-[90%] leading-relaxed">
              Experience one-on-one tailored physical therapy with NABL &amp; IAP certified specialists.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className="flex items-center gap-1.5 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Experts</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Home Visits</span>
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

        {/* Available physiotherapists */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-7"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground tracking-wide uppercase opacity-90">
              Available Therapists
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {filteredPhysios.length} {filteredPhysios.length === 1 ? 'Specialist' : 'Specialists'}
            </span>
          </div>

          <div className="space-y-4">
            {filteredPhysios.length === 0 ? (
              <div className="p-6 rounded-3xl bg-muted/50 text-center border border-border">
                <p className="font-bold text-foreground">No therapists available in this specialization.</p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Try another specialization or check back later.</p>
              </div>
            ) : (
              filteredPhysios.map((physio, index) => (
                <motion.div
                  key={physio.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="p-5 rounded-3xl bg-card/90 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-300 group"
                >
                  {/* Therapist Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-purple-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                      <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-base tracking-tight truncate group-hover:text-primary transition-colors">{physio.name}</h4>
                      <p className="text-xs font-semibold text-primary line-clamp-1 mt-0.5">{physio.specialty}</p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-1">{physio.qualification}</p>
                    </div>
                  </div>

                  {/* Therapist Details Grid */}
                  <div className="grid grid-cols-3 gap-2 py-3.5 bg-muted/30 rounded-2xl border border-border/60 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground">{physio.experience}y</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Experience</p>
                    </div>
                    <div className="text-center border-l border-r border-border/60">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-foreground">{physio.rating}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">({physio.reviews} reviews)</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Available</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">{physio.nextSlot}</p>
                    </div>
                  </div>

                  {/* Single Primary Action Button */}
                  <Button 
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] hover:bg-[position:right_center] transition-all duration-500 font-bold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)] active:scale-[0.98]" 
                    onClick={() => handleProceedToBook(physio)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <span>Book Home Visit • ₹{physio.videoCallFee}</span>
                  </Button>
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
            <span>Why Choose Our Therapists?</span>
          </h4>
          <ul className="space-y-2.5 text-xs text-foreground/80 font-medium">
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>All physiotherapists are IAP &amp; NABL certified specialists</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Comprehensive 45-minute home physical therapy sessions</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Personalized exercise plans &amp; live recovery tracking</span>
            </li>
          </ul>
        </motion.div>
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default PhysioConsultScreen;
