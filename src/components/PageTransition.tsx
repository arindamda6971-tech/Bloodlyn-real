import { ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Analytics } from "@/lib/analytics";

const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

interface PageTransitionProps {
  children: ReactNode;
  location?: any;
}

/**
 * Ultra-Smooth Native App Page Transition.
 * Uses Framer Motion's AnimatePresence to slide pages in and out
 * exactly like an iOS/Android native navigation stack.
 */
const PageTransition = ({ children, location: propLocation }: PageTransitionProps) => {
  const currentLoc = useLocation();
  const location = propLocation || currentLoc;
  const navType = useNavigationType();

  useEffect(() => {
    Analytics.trackPageView(location.pathname, location.pathname + location.search);
  }, [location.pathname, location.search]);

  const isTab = TAB_PATHS.includes(location.pathname);
  const isPop = navType === "POP";

  // Native iOS-style transition variants
  const variants = isTab
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : isPop
    ? {
        initial: { x: "-30%", opacity: 0.8 }, // Slide in slightly from left
        animate: { x: 0, opacity: 1 },
        exit: { x: "100%", opacity: 1, zIndex: 10 }, // Slide out completely to right
      }
    : {
        initial: { x: "100%", opacity: 1, zIndex: 10 }, // New page slides in from right
        animate: { x: 0, opacity: 1 },
        exit: { x: "-30%", opacity: 0.8 }, // Old page pushes slightly to the left
      };

  return (
    <motion.div
      key={location.pathname}
      initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{
            type: "tween",
            ease: [0.32, 0.72, 0, 1], // Native iOS-like ease-out cubic bezier
            duration: 0.65 // Slightly increased from 0.55s for maximum grace
          }}
          className="w-full h-full absolute top-0 left-0 bg-background"
      style={{
        contain: "paint size layout",
        willChange: "transform, opacity",
        backfaceVisibility: "hidden", // Forces dedicated GPU layer on Android
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
