import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Stethoscope,
  Award,
  Star,
  Clock,
  Heart,
  Sparkles,
  Shield,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  rating: number;
  reviews_count: number;
  fee: number;
  availability: string;
  qualification: string;
}

// Mock doctors data
const mockDoctors: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Rajesh Kumar",
    specialization: "Cardiology",
    experience: 12,
    rating: 4.9,
    reviews_count: 324,
    fee: 599,
    availability: "9 AM - 5 PM",
    qualification: "MD (Cardiology), DM (Cardiology)",
  },
  {
    id: "doc-2",
    name: "Dr. Priya Sharma",
    specialization: "Cardiac Specialist",
    experience: 8,
    rating: 4.8,
    reviews_count: 256,
    fee: 499,
    availability: "10 AM - 6 PM",
    qualification: "MD (Cardiology), FACC",
  },
  {
    id: "doc-3",
    name: "Dr. Vikram Singh",
    specialization: "Cardiac Surgeon",
    experience: 15,
    rating: 4.9,
    reviews_count: 512,
    fee: 799,
    availability: "8 AM - 4 PM",
    qualification: "MCh (Cardiac Surgery), FACS",
  },
  {
    id: "doc-4",
    name: "Dr. Anjali Gupta",
    specialization: "Cardiologist",
    experience: 10,
    rating: 4.7,
    reviews_count: 198,
    fee: 549,
    availability: "11 AM - 7 PM",
    qualification: "MD (Cardiology), FACC",
  },
  {
    id: "doc-5",
    name: "Dr. Arjun Reddy",
    specialization: "ECG Specialist",
    experience: 7,
    rating: 4.8,
    reviews_count: 289,
    fee: 399,
    availability: "9 AM - 6 PM",
    qualification: "MD (Internal Medicine)",
  },
];

const ECGTestScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDoctors(mockDoctors);
    setLoading(false);
  }, []);

  const handleBookDoctor = (doctor: Doctor) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book an ECG test",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    
    const success = addToCart({
      id: `ecg-${doctor.id}`,
      name: `12-Lead ECG Test with ${doctor.name}`,
      price: doctor.fee,
      labId: "ecg-service",
      labName: "HealthSwift Cardiac Care",
      vendorId: "generic-service",
    });

    if (success) {
      toast({
        title: "Added to Cart",
        description: `12-Lead ECG Test with ${doctor.name} added to cart`,
      });
      navigate("/cart");
    }
  };

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Book ECG Test" />

      <div className="px-4 pb-8 pt-1">
        {/* Premium Title Header */}
        <PremiumPageHeader
          title="Advanced ECG Diagnostics"
          subtitle="12-Lead precise testing at your home"
          icon={Heart}
          accent="from-rose-600 via-pink-600 to-purple-600"
        />

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-rose-950 via-slate-900 to-indigo-950 text-white shadow-[0_10px_30px_-10px_rgba(88,28,135,0.5)] relative overflow-hidden border border-white/10"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold tracking-wide uppercase mb-3 text-rose-200">
              <Heart className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Cardiac Excellence</span>
            </div>
            <h2 className="text-xl font-black tracking-tight leading-snug">
              Instant 12-Lead ECG,<br />Analyzed by Top Doctors
            </h2>
            <p className="text-xs text-slate-300 mt-2 max-w-[90%] leading-relaxed">
              Get professional hospital-grade cardiac monitoring from the comfort and safety of your home.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className="flex items-center gap-1.5 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>NABL Accredited</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>In-Home Setup</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Select a Doctor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-7"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground tracking-wide uppercase opacity-90">
              Available Cardiologists
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'}
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 rounded-3xl bg-card border border-border">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-11 w-full mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-6 rounded-3xl bg-muted/50 text-center border border-border">
              <p className="text-muted-foreground font-medium">No doctors available at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {doctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="p-5 rounded-3xl bg-card/90 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-300 group"
                >
                  {/* Doctor Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 via-primary/10 to-purple-500/20 flex items-center justify-center flex-shrink-0 border border-rose-500/20 group-hover:scale-105 transition-transform duration-300">
                      <Stethoscope className="w-7 h-7 text-rose-500 dark:text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-base tracking-tight truncate group-hover:text-primary transition-colors">{doctor.name}</h4>
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 line-clamp-1 mt-0.5">{doctor.specialization}</p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-1">{doctor.qualification}</p>
                    </div>
                  </div>

                  {/* Doctor Details */}
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
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">({doctor.reviews_count} reviews)</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Available</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">{doctor.availability}</p>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] hover:bg-[position:right_center] transition-all duration-500 font-bold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)] active:scale-[0.98]"
                    onClick={() => handleBookDoctor(doctor)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <span>Book Home Visit • ₹{doctor.fee}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-7 p-5 rounded-3xl bg-gradient-to-br from-rose-500/10 via-blue-500/5 to-indigo-500/10 border border-rose-500/20 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm tracking-wide uppercase opacity-90">
            <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Diagnostic Assurances</span>
          </h4>
          <ul className="space-y-2.5 text-xs text-foreground/80 font-medium">
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>All doctors are NABL certified and experienced cardiologists</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Fees are inclusive of complete 12-lead testing and doctor consultation</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Expert digital reports and review available within 2 hours</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ECGTestScreen;
