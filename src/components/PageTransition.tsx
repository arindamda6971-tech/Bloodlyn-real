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

  // Native iOS-style transition variants optimized for mobile GPU
  const variants = isTab
    ? {
        initial: { opacity: 0, zIndex: 1 },
        animate: { opacity: 1, zIndex: 1 },
        exit: { opacity: 0, zIndex: 1 },
      }
    : isPop
    ? {
        // Popping a screen: previous screen slides in from left (dimmed), popped screen slides out to right
        initial: { x: "-30vw", opacity: 0.8, zIndex: 1 }, 
        animate: { x: "0vw", opacity: 1, zIndex: 1 },
        exit: { x: "100vw", opacity: 1, zIndex: 10 }, 
      }
    : {
        // Pushing a new screen: new screen slides in from right, current screen slides out to left (dimmed)
        initial: { x: "100vw", opacity: 1, zIndex: 10 }, 
        animate: { x: "0vw", opacity: 1, zIndex: 10 },
        exit: { x: "-30vw", opacity: 0.8, zIndex: 1 }, 
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
            ease: [0.36, 0.66, 0.04, 1], // Standard snappy mobile ease
            duration: 0.4 // Snappier duration for buttery smooth feel
          }}
          className="w-full h-full absolute top-0 left-0 bg-background"
      style={{
        contain: "paint layout", // Removed strict size containment to prevent layout thrashing
        willChange: "transform", // Prioritize hardware transform over opacity for sliding pages
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "translateZ(0)", // Force 3D hardware acceleration
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
