import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  Video,
  Phone,
  Shield,
  Stethoscope,
  Activity,
  Bone,
  Brain,
  Heart,
  User,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { toast } from "sonner";

const doctors = [
  {
    id: 1,
    name: "Dr. Priya Sharma",
    specialty: "General Physician",
    experience: "12 years",
    rating: 4.9,
    reviews: 1240,
    available: true,
    nextSlot: "Available now",
    videoCallFee: 299,
    audioCallFee: 199,
    physicalCallFee: 499,
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Dr. Rajesh Kumar",
    specialty: "Internal Medicine",
    experience: "15 years",
    rating: 4.8,
    reviews: 980,
    available: true,
    nextSlot: "In 15 mins",
    videoCallFee: 399,
    audioCallFee: 299,
    physicalCallFee: 599,
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Dr. Ananya Patel",
    specialty: "Endocrinologist",
    experience: "10 years",
    rating: 4.9,
    reviews: 756,
    available: false,
    nextSlot: "Tomorrow 10 AM",
    videoCallFee: 599,
    audioCallFee: 499,
    physicalCallFee: 799,
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face",
  },
];

const specializations = [
  { id: "gp", icon: Stethoscope, label: "General Physician", color: "bg-primary/10 text-primary" },
  { id: "med", icon: User, label: "Internal Medicine", color: "bg-success/10 text-success" },
  { id: "peds", icon: Activity, label: "Pediatrics", color: "bg-pink-100 text-pink-600" },
  { id: "ortho", icon: Bone, label: "Orthopaedic", color: "bg-success/10 text-success" },
  { id: "dental", icon: User, label: "Dental", color: "bg-secondary/10 text-secondary" },
  { id: "cardio", icon: Heart, label: "Cardiology", color: "bg-destructive/10 text-destructive" },
  { id: "derm", icon: Activity, label: "Dermatology", color: "bg-warning/10 text-warning" },
  { id: "neuro", icon: Brain, label: "Neurology", color: "bg-indigo-100 text-indigo-600" },
];

const DoctorConsultScreen = () => {
  const navigate = useNavigate();
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);

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

  // Human-friendly label for the currently selected specialization (used in empty state)
  const selectedSpecLabel = selectedSpecialization
    ? specializations.find((s) => s.id === selectedSpecialization)?.label ?? selectedSpecialization
    : null;

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Book a Doctor" />

      <div className="px-4 pb-32">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
        >
          <h2 className="text-lg font-bold">Get Expert Advice</h2>
          <p className="text-sm opacity-90 mt-1">
            Connect with certified doctors to understand your test results better
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
              <Shield className="w-3 h-3 mr-1" />
              MBBS Verified
            </Badge>
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
              Instant Connect
            </Badge>
          </div>
        </motion.div>

        {/* Specializations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <h3 className="font-semibold text-foreground mb-3">Specializations</h3>
          <div className="grid grid-cols-4 gap-2">
            {specializations.map((spec) => (
              <button
                key={spec.id}
                onClick={() => setSelectedSpecialization(selectedSpecialization === spec.id ? null : spec.id)}
                className={`py-3 px-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                  selectedSpecialization === spec.id ? "bg-primary text-primary-foreground" : spec.color
                }`}
              >
                <spec.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium text-center leading-tight">{spec.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Available doctors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Available Doctors</h3>
            <button className="text-primary text-sm font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {filteredDoctors.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-semibold text-foreground">
                  {selectedSpecialization
                    ? `There are no ${selectedSpecLabel} doctors available right now.`
                    : "No doctors available right now."}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Try another specialization or check back later.</p>
              </div>
            ) : (
              filteredDoctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onClick={() => setSelectedDoctor(doctor.id)}
                  className={`soft-card cursor-pointer transition-all ${
                    selectedDoctor === doctor.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex gap-4">
                    <img
                      src={doctor.image}
                      alt={doctor.name}
                      className="w-16 h-16 rounded-2xl object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{doctor.name}</h4>
                        <Badge variant={doctor.available ? "live" : "secondary"}>
                          {doctor.available ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      <p className="text-xs text-muted-foreground">{doctor.experience} experience</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-warning fill-warning" />
                          <span className="text-sm font-medium">{doctor.rating}</span>
                          <span className="text-xs text-muted-foreground">({doctor.reviews})</span>
                        </div>
                        <span className="text-xs text-muted-foreground">•</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {doctor.nextSlot}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3">Choose consultation type:</p>
                    <div className="mb-3">
                      <Button
                        variant="hero"
                        className="w-full"
                        onClick={() => {
                          if (!doctor.available) {
                            toast.error("Doctor is currently offline", {
                              description: `Next available: ${doctor.nextSlot}`,
                            });
                            return;
                          }
                          navigate("/consultation-booking", {
                            state: { type: "video", professional: doctor, professionalType: "doctor" },
                          });
                        }}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Video Call • ₹{doctor.videoCallFee}
                      </Button>
                    </div>
                    <div className="mb-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (!doctor.available) {
                            toast.error("Doctor is currently offline", {
                              description: `Next available: ${doctor.nextSlot}`,
                            });
                            return;
                          }
                          navigate("/consultation-booking", {
                            state: { type: "physical", professional: doctor, professionalType: "doctor" },
                          });
                        }}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Physical Appointment • ₹{doctor.physicalCallFee}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>


    </MobileLayout>
  );
};

export default DoctorConsultScreen;
