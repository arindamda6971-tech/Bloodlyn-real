import { ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

/**
 * Ultra-smooth, simultaneous dual-page transition mimicking iOS native feel.
 *
 * To eliminate the "blank screen" flash:
 * 1. Uses popLayout to keep the EXITING page in the DOM while the ENTERING page slides in.
 * 2. Enforces a solid background color on the transition container.
 * 3. Uses GPU-only properties (transform, opacity) to avoid main-thread jank.
 */
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navType = useNavigationType();

  const isTab = TAB_PATHS.includes(location.pathname);
  const isBack = navType === "POP";

  const transition = {
    type: "spring",
    stiffness: 380,
    damping: 35,
    mass: 1,
    // Reduce duration slightly for a snappier feel while maintaining iOS curves
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
        // Exit can be slightly faster to clear the way for interaction
        damping: 40
      },
    }),
  };

  const direction = isTab ? "tab" : isBack ? "back" : "forward";

  return (
    <div
      className="transition-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
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
            position: "relative",
            backgroundColor: "hsl(var(--background))",
            // iOS style shadow on the leading edge
            boxShadow: isBack ? "none" : "-10px 0 30px -10px rgba(0,0,0,0.12)",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
