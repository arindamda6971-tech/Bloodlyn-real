import { ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

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
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 35,
            mass: 0.8,
            restDelta: 0.01
          }}
          className="w-full h-full absolute top-0 left-0 bg-background"
          style={{
            contain: "paint size layout",
            boxShadow: isTab ? "none" : (isPop ? "none" : "-10px 0 30px rgba(0,0,0,0.15)"),
            willChange: "transform, opacity",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
