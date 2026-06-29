import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Clock,
  Star,
  Shield,
  ShoppingCart,
  Stethoscope,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
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
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

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
    confirmReplace();
    toast({ title: "Cart replaced", description: "Cart replaced with new lab items" });
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
          <p className="text-muted-foreground">Unable to load center details</p>
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

      <div className="px-4 pb-8">
        {/* Center Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">{lab.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{lab.address}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  ⭐ {lab.rating}
                </Badge>
                {lab.is_verified && (
                  <Shield className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lab Conflict Alert Dialog */}
        <AlertDialog open={!!pendingItem} onOpenChange={(open) => !open && cancelReplace()}>
          <AlertDialogContent className="max-w-[90%] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Different Lab Selected</AlertDialogTitle>
              <AlertDialogDescription>
                You have added some tests from <span className="font-semibold text-foreground">{pendingItem?.existingLabName}</span>.
                You can't add tests from another lab at the same time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="flex-1 mt-0" onClick={cancelReplace}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction className="flex-1" onClick={handleConfirmReplace}>
                Replace Cart
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ECG Test Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 p-4 rounded-2xl bg-destructive/5 border border-destructive/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-destructive" />
            <h4 className="font-semibold text-foreground">12-Lead ECG Test</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Select a cardiologist to perform your ECG test. Each doctor offers specialized expertise.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>15 mins</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">₹{lab.ecg_price}</Badge>
            </div>
          </div>
        </motion.div>

        {/* Doctors List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <h3 className="font-semibold text-foreground mb-4">Available Doctors</h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-10 w-full mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {doctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
                >
                  {/* Doctor Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm">{doctor.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{doctor.specialization}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{doctor.qualification}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary">₹{doctor.fee}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Consultation</p>
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-border/50">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold text-foreground">{doctor.experience}y</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Experience</p>
                    </div>
                    <div className="text-center border-l border-r border-border/50">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-foreground">{doctor.rating}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">({doctor.reviews_count})</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-semibold text-foreground">Available</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{doctor.availability}</p>
                    </div>
                  </div>



                  {/* Book Button */}
                  <Button
                    className="w-full mt-3 h-10 bg-primary hover:bg-primary/90"
                    onClick={() => handleBookDoctor(doctor)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Book Now - ₹{doctor.fee}
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
          transition={{ delay: 0.2 }}
          className="mt-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
        >
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            💡 Quick Tips
          </h4>
          <ul className="space-y-1 text-sm text-foreground">
            <li>• All doctors are NABL certified and experienced cardiologists</li>
            <li>• Fees are inclusive of test and consultation</li>
            <li>• Reports will be available within 2 hours</li>
          </ul>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ECGDoctorsScreen;
