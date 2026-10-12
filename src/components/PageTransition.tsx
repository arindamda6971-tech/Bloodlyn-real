import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePresence } from "framer-motion";
import { Analytics } from "@/lib/analytics";
import { getTransitionClass, getTransitionDuration, getEffectiveNavType } from "@/lib/navigation-transition";

interface PageTransitionProps {
  children: ReactNode;
  location?: any;
}

/**
 * Ultra-Smooth Native App Page Transition.
 * Bypasses Framer Motion JS locking and uses pure CSS compositing
 * to guarantee 60/120fps even when React blocks the main thread.
 */
const PageTransition = ({ children, location: propLocation }: PageTransitionProps) => {
  const currentLoc = useLocation();
  const location = propLocation || currentLoc;
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    Analytics.trackPageView(location.pathname, location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Keep unmounted page in DOM for the exact duration so the CSS exit animation completes
  useEffect(() => {
    if (!isPresent) {
      const timer = setTimeout(safeToRemove, getTransitionDuration());
      return () => clearTimeout(timer);
    }
  }, [isPresent, safeToRemove]);

  const animClass = getTransitionClass(isPresent);
  const isPop = getEffectiveNavType() === "POP";

  // Z-Index logic:
  // - Pushing: Incoming (isPresent) is 10, Outgoing (!isPresent) is 1
  // - Popping: Incoming (isPresent) is 1, Outgoing (!isPresent) is 10
  const zIndex = isPop ? (isPresent ? 1 : 10) : (isPresent ? 10 : 1);

  return (
    <div
      key={location.pathname}
      className={`w-full h-full absolute top-0 left-0 bg-background overflow-hidden ${animClass}`}
      style={{
        zIndex: zIndex,
        WebkitOverflowScrolling: "touch",
        contain: "layout paint",
        backfaceVisibility: "hidden",
        transform: "translate3d(0, 0, 0)",
        pointerEvents: isPresent ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
