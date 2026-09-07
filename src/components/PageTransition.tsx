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

  // Native iOS-style transition variants optimized for mobile GPU (now with depth scaling)
  const variants = isTab
    ? {
        initial: { opacity: 0, scale: 0.98, zIndex: 1 },
        animate: { opacity: 1, scale: 1, zIndex: 1 },
        exit: { opacity: 0, scale: 0.98, zIndex: 1 },
      }
    : isPop
    ? {
        // Popping a screen: previous screen slides in from left & scales up, popped screen slides out to right
        initial: { x: "-30vw", opacity: 0.7, scale: 0.94, zIndex: 1 }, 
        animate: { x: "0vw", opacity: 1, scale: 1, zIndex: 1 },
        exit: { x: "100vw", opacity: 1, scale: 1, zIndex: 10 }, 
      }
    : {
        // Pushing a new screen: new screen slides in from right, current screen slides out to left & scales down
        initial: { x: "100vw", opacity: 1, scale: 1, zIndex: 10 }, 
        animate: { x: "0vw", opacity: 1, scale: 1, zIndex: 10 },
        exit: { x: "-30vw", opacity: 0.7, scale: 0.94, zIndex: 1 }, 
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
            ease: [0.32, 0.72, 0, 1], // Smooth iOS-like deceleration curve
            duration: 0.5 // Increased duration for a smoother, sweeping scale effect
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
