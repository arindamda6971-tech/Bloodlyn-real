import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Shield, Brain, ChevronRight, Activity, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    icon: Clock,
    title: "Book any test in 60 minutes",
    description: "Get tested from the comfort of your home with our rapid response team available 24/7.",
    color: "from-primary to-primary/60",
  },
  {
    icon: Shield,
    title: "NABL-certified labs & verified phlebotomists",
    description: "100% accurate results from certified laboratories with trained healthcare professionals.",
    color: "from-success to-success/60",
  },
  {
    icon: Activity,
    title: "ECG at your doorstep",
    description: "Get ECG tests done at home with portable devices and instant digital reports from certified technicians.",
    color: "from-amber-500 to-amber-500/60",
  },
  {
    icon: Stethoscope,
    title: "Doctor & Physiotherapist consultations",
    description: "Book video or in-person consultations with certified doctors and physiotherapists for personalized care.",
    color: "from-purple-500 to-purple-500/60",
  },
];

const OnboardingScreen = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/login");
    }
  };

  const handleSkip = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      {/* Skip button */}
      <div className="flex justify-end p-4 pt-safe">
        <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
          Skip
        </Button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={currentSlide === 0 ? false : { opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${slides[currentSlide].color} flex items-center justify-center mb-10 shadow-glow`}
            >
              {(() => {
                const Icon = slides[currentSlide].icon;
                return <Icon className="w-16 h-16 text-primary-foreground" />;
              })()}
            </motion.div>

            {/* Text */}
            <h2 className="text-2xl font-bold text-foreground mb-4 leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-8 pb-12 safe-area-bottom">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>

        {/* Button */}
        <Button
          onClick={handleNext}
          className="w-full"
          variant="hero"
          size="lg"
        >
          {currentSlide === slides.length - 1 ? "Get Started" : "Continue"}
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
