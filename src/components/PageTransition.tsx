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
 * High-Performance "Scale & Fade" transition.
 * More efficient on mobile GPUs than full-screen slide translations.
 * Eliminates lag by using only transform: scale and opacity.
 */
const PageTransition = ({ children, location: propLocation }: PageTransitionProps) => {
  const currentLoc = useLocation();
  const location = propLocation || currentLoc;

  const transition = {
    duration: 0.3,
    ease: [0.33, 1, 0.68, 1], // Custom cubic-bezier for a "Native Zoom" feel
  };

  const variants = {
    initial: {
      scale: 0.95,
      opacity: 0,
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition,
    },
    exit: {
      scale: 1.05,
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: "easeInOut"
      },
    },
  };

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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={location.pathname}
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
            willChange: "transform, opacity",
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
