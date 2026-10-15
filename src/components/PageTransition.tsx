import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { usePresence } from "framer-motion";
import { Analytics } from "@/lib/analytics";
import {
  getTransitionClass,
  getTransitionDuration,
  getEffectiveNavType,
  beginTransition,
  endTransition,
} from "@/lib/navigation-transition";

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
  const [isAnimating, setIsAnimating] = useState(true);
  const [isExited, setIsExited] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);
  const gateHeldRef = useRef(false);

  useEffect(() => {
    Analytics.trackPageView(location.pathname, location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Hold the transition gate while entering OR exiting is active
  useEffect(() => {
    const isUnderway = (isPresent && isAnimating) || (!isPresent && !isExited);
    if (isUnderway && !gateHeldRef.current) {
      gateHeldRef.current = true;
      beginTransition();
    } else if (!isUnderway && gateHeldRef.current) {
      gateHeldRef.current = false;
      endTransition();
    }
    return () => {
      if (gateHeldRef.current) {
        gateHeldRef.current = false;
        endTransition();
      }
    };
  }, [isPresent, isAnimating, isExited]);

  const releaseEnter = () => {
    if (gateHeldRef.current) {
      gateHeldRef.current = false;
      endTransition();
    }
    setIsAnimating(false);
  };

  const releaseExit = () => {
    if (gateHeldRef.current) {
      gateHeldRef.current = false;
      endTransition();
    }
    setIsExited(true);
    if (safeToRemove) {
      safeToRemove();
    }
  };

  // Fallback timer (duration + 80ms) in case animationend does not fire
  useEffect(() => {
    const fallbackMs = getTransitionDuration() + 80;

    if (!isPresent) {
      const timer = setTimeout(() => {
        releaseExit();
      }, fallbackMs);
      return () => clearTimeout(timer);
    } else if (isAnimating) {
      const timer = setTimeout(() => {
        releaseEnter();
      }, fallbackMs);
      return () => clearTimeout(timer);
    }
  }, [isPresent, isAnimating]);

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    // Ignore bubbled events from children
    if (e.target !== elRef.current) return;
    if (!e.animationName.startsWith("page")) return;

    if (!isPresent) {
      releaseExit();
    } else {
      releaseEnter();
    }
  };

  // When exiting (!isPresent), ALWAYS play the exit slide animation!
  // When entering (isPresent), play the enter slide animation until settled, then release compositor layers.
  const animClass = !isPresent 
    ? getTransitionClass(false) 
    : (isAnimating ? getTransitionClass(true) : "");

  const isPop = getEffectiveNavType() === "POP";

  // Z-Index logic:
  // - Pushing: Incoming (isPresent) is 10, Outgoing (!isPresent) is 1
  // - Popping: Incoming (isPresent) is 1, Outgoing (!isPresent) is 10
  const zIndex = isPop ? (isPresent ? 1 : 10) : (isPresent ? 10 : 1);

  return (
    <div
      ref={elRef}
      key={location.pathname}
      onAnimationEnd={handleAnimationEnd}
      className={`w-full h-full absolute top-0 left-0 bg-background overflow-hidden ${animClass}`}
      style={{
        zIndex: zIndex,
        WebkitOverflowScrolling: "touch",
        contain: "layout paint",
        backfaceVisibility: "hidden",
        pointerEvents: isPresent ? "auto" : "none",
        visibility: isExited ? "hidden" : "visible",
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
