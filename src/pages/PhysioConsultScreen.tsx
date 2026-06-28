import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  Video,
  Phone,
  Shield,
  ChevronRight,
  Activity,
  Bone,
  Brain,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const physiotherapists = [
  {
    id: 1,
    name: "Dr. Vikram Singh",
    specialty: "Sports Physiotherapy",
    experience: "10 years",
    rating: 4.9,
    reviews: 856,
    available: true,
    nextSlot: "Available now",
    videoCallFee: 399,
    audioCallFee: 299,
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Dr. Meera Gupta",
    specialty: "Orthopedic Rehabilitation",
    experience: "8 years",
    rating: 4.8,
    reviews: 642,
    available: true,
    nextSlot: "In 30 mins",
    videoCallFee: 349,
    audioCallFee: 249,
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Dr. Arjun Menon",
    specialty: "Neurological Physiotherapy",
    experience: "12 years",
    rating: 4.9,
    reviews: 978,
    available: false,
    nextSlot: "Tomorrow 11 AM",
    videoCallFee: 499,
    audioCallFee: 399,
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 4,
    name: "Dr. Kavya Nair",
    specialty: "Cardiopulmonary Physio",
    experience: "7 years",
    rating: 4.7,
    reviews: 432,
    available: true,
    nextSlot: "In 1 hour",
    videoCallFee: 349,
    audioCallFee: 249,
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
  },
];

const specializations = [
  { id: "sports", icon: Activity, label: "Sports Injury", color: "bg-primary/10 text-primary" },
  { id: "ortho", icon: Bone, label: "Orthopedic", color: "bg-success/10 text-success" },
  { id: "neuro", icon: Brain, label: "Neurological", color: "bg-warning/10 text-warning" },
  { id: "cardio", icon: Heart, label: "Cardiopulmonary", color: "bg-destructive/10 text-destructive" },
];

const PhysioConsultScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);

  const filteredPhysios = selectedSpecialization
    ? physiotherapists.filter((p) => {
        if (selectedSpecialization === "sports") return p.specialty.includes("Sports");
        if (selectedSpecialization === "ortho") return p.specialty.includes("Orthopedic");
        if (selectedSpecialization === "neuro") return p.specialty.includes("Neurological");
        if (selectedSpecialization === "cardio") return p.specialty.includes("Cardiopulmonary");
        return true;
      })
    : physiotherapists;

  const handleBookPhysio = (physio: typeof physiotherapists[0], type: "video" | "audio") => {
    // Navigate to the unified consultation booking screen (same as doctor booking)
    navigate("/consultation-booking", {
      state: {
        type,
        professional: physio,
        professionalType: "physiotherapist",
      },
    });
  };

  const handleProceedToBook = (physio: typeof physiotherapists[0]) => {
    if (!user) {
      toast.error("Please login to book a session");
      navigate("/login");
      return;
    }

    // Map to PhysioBookingScreen's expected shape
    const mapped = {
      id: String(physio.id),
      name: physio.name,
      specialty: physio.specialty,
      experience: physio.experience,
      rating: physio.rating,
      reviews_count: physio.reviews,
      fee: physio.videoCallFee ?? physio.audioCallFee ?? 0,
      available: physio.available,
      qualification: "",
      image: physio.image,
    };

    navigate("/physio-booking", { state: { physio: mapped } });
  };

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Book a Physiotherapist" />

      <div className="px-4 pb-8">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground"
        >
          <h2 className="text-lg font-bold">Expert Physiotherapy Care</h2>
          <p className="text-sm opacity-90 mt-1">
            Connect with certified physiotherapists for pain relief, rehabilitation & recovery
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="bg-secondary-foreground/20 text-secondary-foreground border-0">
              <Shield className="w-3 h-3 mr-1" />
              Certified Experts
            </Badge>
            <Badge variant="secondary" className="bg-secondary-foreground/20 text-secondary-foreground border-0">
              Home Visits Available
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
                  selectedSpecialization === spec.id
                    ? "bg-primary text-primary-foreground"
                    : spec.color
                }`}
              >
                <spec.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium text-center leading-tight">{spec.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Available physiotherapists */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Available Physiotherapists</h3>
          </div>
          <div className="space-y-3">
            {filteredPhysios.map((physio, index) => (
              <motion.div
                key={physio.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="soft-card"
              >
                <div className="flex gap-4">
                  <img
                    src={physio.image}
                    alt={physio.name}
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">{physio.name}</h4>
                      <Badge variant={physio.available ? "live" : "secondary"}>
                        {physio.available ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{physio.specialty}</p>
                    <p className="text-xs text-muted-foreground">{physio.experience} experience</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="text-sm font-medium">{physio.rating}</span>
                        <span className="text-xs text-muted-foreground">({physio.reviews})</span>
                      </div>
                      <span className="text-xs text-muted-foreground">•</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {physio.nextSlot}
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
                      onClick={() => handleBookPhysio(physio, "video")}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video Call • ₹{physio.videoCallFee}
                    </Button>
                  </div>
                  <div>
                    <Button className="w-full" variant="hero" onClick={() => handleProceedToBook(physio)}>
                      Book Home Visit • ₹{physio.videoCallFee}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
        >
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            💡 Quick Tips
          </h4>
          <ul className="space-y-1 text-sm text-foreground">
            <li>• All physiotherapists are certified and experienced</li>
            <li>• 30-minute consultation sessions</li>
            <li>• Get personalized exercise plans</li>
          </ul>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default PhysioConsultScreen;
