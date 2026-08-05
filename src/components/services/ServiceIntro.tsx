import { motion } from "framer-motion";
import { ArrowLeft, Stethoscope, Video, Languages, Activity, Calendar, FileText, HeartPulse, Home, FileHeart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";

type ServiceType = "doctor" | "physio" | "ecg" | "bp";

interface ServiceIntroProps {
  serviceType: ServiceType;
  onProceed: () => void;
}

export const ServiceIntro = ({ serviceType, onProceed }: ServiceIntroProps) => {
  const navigate = useNavigate();

  const getServiceData = () => {
    switch (serviceType) {
      case "doctor":
        return {
          title: "Consult a Doctor",
          icon: Stethoscope,
          gradient: "from-[#10b981] to-[#0d9488]",
          badgeBg: "bg-[#ecfdf5]",
          badgeText: "text-[#059669]",
          glow: "bg-[#10b981]/20",
          steps: [
            {
              icon: Stethoscope,
              title: "Choose Consultancy Type",
              description: "Select between an in-clinic visit or online consultancy.",
            },
            {
              icon: Languages,
              title: "Choose Your Language",
              description: "Select your preferred language for better communication.",
            },
            {
              icon: Video,
              title: "Connect & Get Report",
              description: "Do the video / audio call and get your report easily.",
            }
          ]
        };
      case "physio":
        return {
          title: "Consult Physiotherapist",
          icon: Activity,
          gradient: "from-[#6366f1] to-[#2563eb]",
          badgeBg: "bg-[#eef2ff]",
          badgeText: "text-[#4f46e5]",
          glow: "bg-[#6366f1]/20",
          steps: [
            {
              icon: Calendar,
              title: "Select Schedule",
              description: "Choose your preferred time and address for the visit.",
            },
            {
              icon: Home,
              title: "Expert Home Visit",
              description: "Our expert physiotherapist visits your home for the session.",
            },
            {
              icon: Activity,
              title: "Personalized Care",
              description: "Start your personalized recovery journey safely.",
            }
          ]
        };
      case "ecg":
        return {
          title: "At-Home ECG Test",
          icon: HeartPulse,
          gradient: "from-[#f43f5e] to-[#dc2626]",
          badgeBg: "bg-[#fff1f2]",
          badgeText: "text-[#e11d48]",
          glow: "bg-[#f43f5e]/20",
          steps: [
            {
              icon: Calendar,
              title: "Book Instantly",
              description: "Book your At-Home ECG test from your mobile instantly.",
            },
            {
              icon: Home,
              title: "Home Visit",
              description: "Our certified partner visits your home to perform the test.",
            },
            {
              icon: FileText,
              title: "Get Report on Spot",
              description: "Get your ECG report generated and handed over on the spot.",
            }
          ]
        };
      case "bp":
        return {
          title: "Home BP Check",
          icon: HeartPulse,
          gradient: "from-[#f43f5e] to-[#3b82f6]",
          badgeBg: "bg-[#eff6ff]",
          badgeText: "text-[#2563eb]",
          glow: "bg-[#3b82f6]/20",
          steps: [
            {
              icon: Calendar,
              title: "Book Here",
              description: "Book your BP check easily through the app.",
            },
            {
              icon: Home,
              title: "Home Visit",
              description: "Our certified partner will visit your home to check your BP.",
            },
            {
              icon: FileHeart,
              title: "On-Spot Report",
              description: "Handover your BP report to you on the spot securely.",
            }
          ]
        };
    }
  };

  const data = getServiceData();
  const Icon = data.icon;

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <ScreenHeader title="How It Works" />

        <div className="flex-1 p-6 pb-12 flex flex-col items-center">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${data.gradient} flex items-center justify-center shadow-xl mb-6 mt-4 relative`}
          >
            <div className={`absolute inset-0 rounded-3xl ${data.glow} blur-xl`} />
            <Icon className="w-10 h-10 text-white relative z-10" />
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-black tracking-tight text-center mb-8"
          >
            {data.title}
          </motion.h2>

          <div className="w-full space-y-6 flex-1">
            {data.steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex gap-4 relative"
                >
                  {/* Vertical Line Connector */}
                  {index !== data.steps.length - 1 && (
                    <div className="absolute left-6 top-14 bottom-[-24px] w-[2px] bg-border/60" />
                  )}

                  <div className={`w-12 h-12 rounded-2xl ${data.badgeBg} flex items-center justify-center shrink-0 border border-white/50 shadow-sm z-10`}>
                    <StepIcon className={`w-6 h-6 ${data.badgeText}`} />
                  </div>
                  
                  <div className="pt-2">
                    <h3 className="text-sm font-black mb-1">
                      <span className="text-muted-foreground mr-1">Step {index + 1}:</span>
                      {step.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full mt-10 mb-6"
          >
            <Button
              onClick={onProceed}
              variant="hero"
              className="w-full h-14 rounded-2xl text-[15px]"
            >
              Proceed to Booking
            </Button>
          </motion.div>

        </div>
      </div>
    </MobileLayout>
  );
};
