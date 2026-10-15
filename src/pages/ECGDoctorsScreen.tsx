import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart,
  MapPin,
  Clock,
  Star,
  Shield,
  ShoppingCart,
  Stethoscope,
  Award,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  rating: number | null;
  reviews_count: number | null;
  fee: number;
  availability: string;
  qualification: string;
}

interface DiagnosticCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  logo_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_verified: boolean | null;
  ecg_price: number | null;
  opening_time: string | null;
  closing_time: string | null;
  latitude: number | null;
  longitude: number | null;
  home_collection_available: boolean | null;
}

// Mock doctors data - in production, this would come from the database
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

const ECGDoctorsScreen = () => {
  const navigate = useNavigate();
  const { labId } = useParams<{ labId: string }>();
  const location = useLocation();
  const { toast } = useToast();
  const { addToCart, itemCount, pendingItem, confirmReplace, cancelReplace } = useCart();

  const [lab, setLab] = useState<DiagnosticCenter | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLab = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("diagnostic_centers")
        .select("*")
        .eq("id", labId as string)
        .single();

      if (error) throw error;
      setLab(data);
    } catch (error) {
      console.error("Error fetching lab:", error);
      toast({
        title: "Error",
        description: "Failed to load center details.",
        variant: "destructive",
      });
    }
  }, [labId, toast]);

  useEffect(() => {
    // Get lab data from route state or fetch it
    if (location.state?.lab) {
      setLab(location.state.lab);
    } else if (labId) {
      fetchLab();
    }

    // In production, fetch doctors from database
    // For now, use mock data
    setDoctors(mockDoctors);
    setLoading(false);
  }, [labId, location.state?.lab, fetchLab]);

  const handleBookDoctor = (doctor: Doctor) => {
    if (!lab) return;

    const success = addToCart({
      id: `ecg-${lab.id}-${doctor.id}`,
      name: `12-Lead ECG Test with ${doctor.name}`,
      price: doctor.fee,
      labId: lab.id,
      labName: lab.name,
      vendorId: (lab as any).vendor_id || "generic-service",
    });

    if (success) {
      toast({
        title: "Added to Cart",
        description: `${doctor.name}'s ECG test added to cart`,
      });
      navigate("/cart");
    }
  };

  const handleConfirmReplace = () => {
    confirmReplace(() => navigate("/cart"));
    toast({ title: "Cart replaced", description: "Cart replaced with new booking" });
  };

  if (!lab) {
    return (
      <MobileLayout showNav={true}>
        <ScreenHeader 
          title="ECG Doctors" 
          onBack={() => navigate(-1)}
          rightAction={
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {itemCount}
                </span>
              )}
            </Button>
          }
        />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground font-medium">Unable to load center details</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader 
        title="Select a Doctor" 
        onBack={() => navigate(-1)}
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                {itemCount}
              </span>
            )}
          </Button>
        }
      />

      <div className="px-4 pb-8 pt-1">
        {/* Premium Title Header */}
        <PremiumPageHeader
          title="Select a Cardiologist"
          subtitle={`Expert doctors from ${lab.name}`}
          icon={Heart}
          accent="from-rose-600 via-pink-600 to-purple-600"
        />

        {/* Center Info Card */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border border-primary/20 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-inner">
              <Heart className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-base tracking-tight">{lab.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium leading-relaxed">{lab.address}</p>
              <div className="flex items-center gap-2.5 mt-3">
                <Badge variant="outline" className="text-xs py-1 px-2.5 bg-background/80 shadow-sm border-primary/20 font-bold">
                  ⭐ {lab.rating}
                </Badge>
                {lab.is_verified && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Verified Lab</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lab Conflict Alert Dialog */}
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

        {/* ECG Test Info */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0}}
          className="mt-5 p-5 rounded-3xl bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent border border-rose-500/20 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Heart className="w-5 h-5 text-rose-500 dark:text-rose-400 animate-pulse" />
            <h4 className="font-bold text-foreground text-sm tracking-wide uppercase opacity-90">12-Lead ECG Test</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-4 font-medium leading-relaxed">
            Select a cardiologist to perform your ECG test. Each doctor offers specialized expertise and certified evaluation.
          </p>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-xl border border-border shadow-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span>15 mins duration</span>
            </div>
            <Badge variant="secondary" className="text-xs py-1.5 px-3 rounded-xl bg-primary/10 text-primary border border-primary/20 font-black">
              ₹{lab.ecg_price}
            </Badge>
          </div>
        </motion.div>

        {/* Doctors List */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0}}
          className="mt-7"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground tracking-wide uppercase opacity-90">
              Available Doctors
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {doctors.length} {doctors.length === 1 ? 'Specialist' : 'Specialists'}
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
          ) : (
            <div className="space-y-4">
              {doctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0}}
                  className="p-5 rounded-3xl bg-card/98 border border-white/40 dark:border-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-300 group"
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

                  {/* Book Button */}
                  <Button
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] hover:bg-[position:right_center] transition-all duration-500 font-bold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)] active:scale-[0.98]"
                    onClick={() => handleBookDoctor(doctor)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    <span>Book Now - ₹{doctor.fee}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0}}
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

export default ECGDoctorsScreen;
