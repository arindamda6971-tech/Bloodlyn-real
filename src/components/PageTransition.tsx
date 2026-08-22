import { ReactNode, Suspense } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import RouteFallback from "./RouteFallback";

const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

interface PageTransitionProps {
  children: ReactNode;
  location?: any;
}

/**
 * Ultra-smooth, simultaneous dual-page transition mimicking iOS/Android native feel.
 * Optimized for performance: uses GPU-only properties and popLayout for overlap.
 */
const PageTransition = ({ children, location: propLocation }: PageTransitionProps) => {
  const currentLoc = useLocation();
  const location = propLocation || currentLoc;
  const navType = useNavigationType();

  const isTab = TAB_PATHS.includes(location.pathname);
  const isBack = navType === "POP";

  // Use fixed spring for consistent native feel
  const transition = {
    type: "spring" as const,
    stiffness: 380,
    damping: 38,
    mass: 1,
  };

  const variants = {
    initial: (direction: string) => ({
      x: direction === "forward" ? "100%" : direction === "back" ? "-30%" : 0,
      opacity: direction === "tab" ? 0 : 1,
      scale: direction === "tab" ? 0.98 : 1,
      zIndex: direction === "forward" ? 20 : 10,
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition,
    },
    exit: (direction: string) => ({
      x: direction === "forward" ? "-30%" : direction === "back" ? "100%" : 0,
      opacity: direction === "tab" ? 0 : 1,
      scale: direction === "tab" ? 0.98 : 1,
      zIndex: direction === "forward" ? 10 : 20,
      transition: {
        ...transition,
        damping: 40 // Slightly more damped exit
      },
    }),
  };

  const direction = isTab ? "tab" : isBack ? "back" : "forward";

  return (
    <div
      className="transition-container"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "hsl(var(--background))",
        overflow: "hidden",
      }}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            backgroundColor: "hsl(var(--background))",
            boxShadow: direction === "forward" ? "-10px 0 30px -10px rgba(0,0,0,0.15)" : "none",
            willChange: "transform",
          }}
        >
          <Suspense fallback={<RouteFallback />}>
            {children}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
