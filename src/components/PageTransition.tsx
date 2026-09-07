import { ReactNode, useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { motion, usePresence } from "framer-motion";
import { Analytics } from "@/lib/analytics";

const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

interface PageTransitionProps {
  children: ReactNode;
  location?: any;
}

/**
 * Ultra-Smooth Native App Page Transition.
 * Bypasses Framer Motion JS locking and uses pure CSS compositing
 * to guarantee 60fps even when React blocks the main thread.
 */
const PageTransition = ({ children, location: propLocation }: PageTransitionProps) => {
  const currentLoc = useLocation();
  const location = propLocation || currentLoc;
  const navType = useNavigationType();
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    Analytics.trackPageView(location.pathname, location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Keep unmounted page in DOM for 450ms so the CSS exit animation can play
  useEffect(() => {
    if (!isPresent) {
      const timer = setTimeout(safeToRemove, 450);
      return () => clearTimeout(timer);
    }
  }, [isPresent, safeToRemove]);

  const isTab = TAB_PATHS.includes(location.pathname);
  const isPop = navType === "POP";

  // Determine the pure CSS compositor class
  let animClass = "";
  if (isPresent) {
    animClass = isTab ? "page-anim-fade" : isPop ? "page-anim-pop" : "page-anim-push";
  } else {
    // When popping, the exiting screen slides right (pop-exit). When pushing, the exiting screen slides left (push-exit).
    animClass = isTab ? "page-anim-fade-exit" : isPop ? "page-anim-pop-exit" : "page-anim-push-exit";
  }

  // Z-Index logic:
  // - Pushing: Incoming (isPresent) is 10, Outgoing (!isPresent) is 1
  // - Popping: Incoming (isPresent) is 1, Outgoing (!isPresent) is 10
  const zIndex = isPop ? (isPresent ? 1 : 10) : (isPresent ? 10 : 1);

  return (
    <div
      key={location.pathname}
      className={`w-full h-full absolute top-0 left-0 bg-white dark:bg-gray-950 overflow-y-auto overflow-x-hidden ${animClass}`}
      style={{
        zIndex: zIndex,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
