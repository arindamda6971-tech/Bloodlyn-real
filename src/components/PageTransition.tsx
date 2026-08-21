import { ReactNode, useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";

const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

/**
 * Ultra-smooth, simultaneous dual-page transition mimicking iOS/Android native feel.
 * Optimized for performance: uses GPU-only properties.
 */
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navType = useNavigationType();

  const isTab = TAB_PATHS.includes(location.pathname);
  const isBack = navType === "POP";

  // Trigger haptic feedback on navigation
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const triggerHaptic = async () => {
      try {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // Haptics not available
      }
    };

    triggerHaptic();
  }, [location.pathname]);

  const transition = {
    type: "spring",
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
        position: "fixed", // Lock the container to viewport
        inset: 0,
        backgroundColor: "hsl(var(--background))",
        overflow: "hidden"
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
            boxShadow: direction === "forward" ? "-10px 0 30px -10px rgba(0,0,0,0.1)" : "none",
            willChange: "transform",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
