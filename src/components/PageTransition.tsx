import { ReactNode, useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";

const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

interface PageTransitionProps {
  children: ReactNode;
  location?: any;
}

/**
 * Ultra-smooth, simultaneous dual-page transition mimicking iOS/Android native feel.
 * Optimized for performance: uses GPU-only properties.
 */
const PageTransition = ({ children, location: propLocation }: PageTransitionProps) => {
  const currentLoc = useLocation();
  const location = propLocation || currentLoc;
  const navType = useNavigationType();

  const isTab = TAB_PATHS.includes(location.pathname);
  const isBack = navType === "POP";

  const transition = {
    type: "spring" as const,
    stiffness: 380, // Snappier
    damping: 38,    // Less bounce, more control
    mass: 1.2,      // Feels more "solid" like native
  };

  const variants = {
    initial: (direction: string) => ({
      x: direction === "forward" ? "100%" : direction === "back" ? "-30%" : 0,
      opacity: direction === "tab" ? 0 : 1,
      zIndex: direction === "forward" ? 20 : 10,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition,
    },
    exit: (direction: string) => ({
      x: direction === "forward" ? "-30%" : direction === "back" ? "100%" : 0,
      opacity: direction === "tab" ? 0 : 1,
      zIndex: direction === "forward" ? 10 : 20,
      transition: {
        ...transition,
        damping: 35
      },
    }),
  };

  const direction = isTab ? "tab" : isBack ? "back" : "forward";

  return (
    <div
      className="transition-container"
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "hsl(var(--background))",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
