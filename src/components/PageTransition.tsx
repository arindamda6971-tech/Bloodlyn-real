import { ReactNode, useEffect, useLayoutEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { usePresence } from "framer-motion";
import { Analytics } from "@/lib/analytics";
import {
  getTransitionClass,
  getTransitionDuration,
  getEffectiveNavType,
  isTabToTabTransition,
  TAB_ENTER_CLASS,
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
  // Bottom-bar tabs use a Material-style fade-through instead of a sideways slide:
  // the old tab leaves at once and the new one fades and settles in place. Sliding
  // kept the old tab mounted and animating under the new one, so a few quick taps
  // piled up several full screens and froze the WebView.
  const [enteredFromTab] = useState(isTabToTabTransition);
  const exitsInstantly = !isPresent && isTabToTabTransition();
  const [isAnimating, setIsAnimating] = useState(true);
  const [isExited, setIsExited] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);
  const gateHeldRef = useRef(false);

  useEffect(() => {
    Analytics.trackPageView(location.pathname, location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Hold the transition gate while entering OR exiting is active
  useEffect(() => {
    const isUnderway = (isPresent && isAnimating) || (!isPresent && !isExited && !exitsInstantly);
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
  }, [isPresent, isAnimating, isExited, exitsInstantly]);

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

  // An instantly-switched tab is already hidden during render; release it right away.
  // This must be a passive effect: AnimatePresence only starts tracking the exit in
  // its own layout effect, which runs after ours, and ignores a removal before that,
  // leaving the hidden screen mounted for good.
  useEffect(() => {
    if (exitsInstantly && !isExited) releaseExit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitsInstantly, isExited]);

  // Tapping back to a tab before its removal lands re-presents the same instance;
  // it must show again instead of staying hidden as an exited layer.
  useLayoutEffect(() => {
    if (isPresent && isExited) setIsExited(false);
  }, [isPresent, isExited]);

  // Fallback timer (duration + 80ms) in case animationend does not fire
  useEffect(() => {
    const fallbackMs = getTransitionDuration() + 80;

    if (!isPresent) {
      if (exitsInstantly) return;
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
  }, [isPresent, isAnimating, exitsInstantly]);

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
    ? (exitsInstantly ? "" : getTransitionClass(false))
    : (isAnimating ? (enteredFromTab ? TAB_ENTER_CLASS : getTransitionClass(true)) : "");

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
        visibility: isExited || exitsInstantly ? "hidden" : "visible",
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
