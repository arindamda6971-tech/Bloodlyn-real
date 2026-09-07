import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Construction, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";

interface ServiceUnavailableProps {
  title: string;
  serviceName: string;
}

const ServiceUnavailable = ({ title, serviceName }: ServiceUnavailableProps) => {
  const navigate = useNavigate();

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title={title} />
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center min-h-[60vh]">
        {/* Animated illustration */}
        <motion.div
          className="relative w-40 h-40 mb-8"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
        >
          {/* Outer pulsing ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/10"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Inner circle */}
          <div className="absolute inset-3 rounded-full bg-primary/15 flex items-center justify-center">
            <div className="relative">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Construction className="w-14 h-14 text-primary" strokeWidth={1.5} />
              </motion.div>
              {/* Small map pin */}
              <motion.div
                className="absolute -top-2 -right-3 bg-warning/20 rounded-full p-1.5"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <MapPin className="w-4 h-4 text-warning" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.h2
          className="text-xl font-bold text-foreground mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0}}
        >
          Coming Soon to Your Area
        </motion.h2>
        <motion.p
          className="text-sm text-muted-foreground max-w-xs mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0}}
        >
          <span className="font-medium text-foreground">{serviceName}</span> isn't
          available in your area yet. We're expanding fast — stay tuned!
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0}}
        >
          <Button variant="hero" onClick={() => navigate("/home")}>
            Back to Home
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ServiceUnavailable;
