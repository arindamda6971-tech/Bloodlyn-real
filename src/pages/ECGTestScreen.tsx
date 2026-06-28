import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Stethoscope,
  Award,
  Star,
  Clock,
  Phone,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
    
    // Navigate to booking screen with doctor details
    navigate("/ecg-booking", { state: { doctor } });
  };

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Book ECG Test" />

      <div className="px-4 pb-8">
        {/* Select a Doctor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4"
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
          ) : doctors.length === 0 ? (
            <div className="p-6 rounded-xl bg-muted/50 text-center">
              <p className="text-muted-foreground">No doctors available</p>
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

                  <p className="text-xs text-muted-foreground mb-3">Choose consultation type:</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Button
                      variant="soft"
                      className="flex-1"
                      onClick={() => {
                        const prof = {
                          id: doctor.id,
                          name: doctor.name,
                          specialty: doctor.specialization,
                          image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face',
                          videoCallFee: doctor.fee,
                          audioCallFee: doctor.fee,
                          consultationFee: doctor.fee,
                        } as any;
                        navigate('/consultation-booking', { state: { type: 'video', professional: prof, professionalType: 'doctor' } });
                      }}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video ₹{doctor.fee}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const prof = {
                          id: doctor.id,
                          name: doctor.name,
                          specialty: doctor.specialization,
                          image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face',
                          videoCallFee: doctor.fee,
                          audioCallFee: doctor.fee,
                          consultationFee: doctor.fee,
                        } as any;
                        navigate('/consultation-booking', { state: { type: 'audio', professional: prof, professionalType: 'doctor' } });
                      }}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Audio ₹{doctor.fee}
                    </Button>
                  </div>

                  <Button
                    variant="hero"
                    className="w-full mt-3 h-10"
                    onClick={() => handleBookDoctor(doctor)}
                  >
                    Book home visit - ₹{doctor.fee}
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

export default ECGTestScreen;
