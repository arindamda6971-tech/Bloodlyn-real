import { ReactNode, Suspense, useState, useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import RouteFallback from "./RouteFallback";
import { useHaptics } from "@/hooks/useHaptics";

const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

interface PageTransitionProps {
  children: ReactNode;
  location?: any;
}

/**
 * High-Performance "Scale & Fade" transition.
 * More efficient on mobile GPUs than full-screen slide translations.
 * Eliminates lag by using only transform: scale and opacity.
 *
 * LOCKING MECHANISM: Uses a nested component to freeze the route content
 * during exit, preventing the "Flash" where an exiting page suddenly
 * shows the new page's content.
 */
const PageTransition = ({ children, location: propLocation }: PageTransitionProps) => {
  const currentLoc = useLocation();
  const location = propLocation || currentLoc;
  const { impactLight } = useHaptics();

  // Trigger subtle haptic on navigation
  useEffect(() => {
    impactLight();
  }, [location.pathname, impactLight]);

  const springTransition = {
    type: "spring" as const,
    stiffness: 380,
    damping: 35,
    mass: 1,
  };

  const variants: Variants = {
    initial: {
      scale: 0.98,
      opacity: 0,
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition: springTransition,
    },
    exit: {
      scale: 1.02,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut" as const
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
        contain: "paint size layout",
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
            zIndex: 1,
          }}
        >
          <Suspense fallback={<RouteFallback />}>
            <FrozenRoute children={children} />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/**
 * Ensures the route content is captured at the moment of transition start.
 * Prevents exiting pages from re-rendering with new route data.
 */
const FrozenRoute = ({ children }: { children: ReactNode }) => {
  const [frozen] = useState(children);
  return <>{frozen}</>;
};

export default PageTransition;
