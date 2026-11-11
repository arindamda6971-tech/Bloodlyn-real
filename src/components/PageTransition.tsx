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

// The screen currently sliding out, if any. Quick taps used to leave several leaving
// screens mounted and animating at once (each keeps its exit slide for 450ms), which
// on a phone piled up memory and work until the WebView lagged and crashed. When a
// new screen starts leaving, an older one still on its way out is dropped at once;
// by then it is covered or nearly gone, so nothing visible is lost.
let releaseOlderExit: (() => void) | null = null;

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
  // Which slide this screen plays, and whether it sits under or over its neighbour,
  // are decided once when it arrives and once when it starts leaving. They used to be
  // re-read from the shared "last navigation" on every render, so a quick tap or Back
  // while this screen was still moving flipped its class mid-slide: the CSS animation
  // restarted (a slide that looked too fast or too slow) or the stacking order jumped.
  const [enterClass] = useState(() => (enteredFromTab ? TAB_ENTER_CLASS : getTransitionClass(true)));
  const [enteredAsPop] = useState(() => getEffectiveNavType() === "POP");
  const exitRef = useRef<{ cls: string; pop: boolean; instant: boolean } | null>(null);
  if (isPresent) {
    exitRef.current = null;
  } else if (!exitRef.current) {
    const instant = isTabToTabTransition();
    exitRef.current = {
      cls: instant ? "" : getTransitionClass(false),
      pop: getEffectiveNavType() === "POP",
      instant,
    };
  }
  const exitsInstantly = !isPresent && exitRef.current!.instant;
  const [isAnimating, setIsAnimating] = useState(true);
  // The safety timer below counts from when the slide really starts. Mounting a heavy
  // screen on a slow phone can delay that first frame by a few hundred ms, and a timer
  // counted from mount used to cut the slide short (it snapped to the end).
  const [motionStarted, setMotionStarted] = useState(false);
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

  const releaseExitRef = useRef(releaseExit);
  releaseExitRef.current = releaseExit;

  // At most one screen slides out at a time (see releaseOlderExit above).
  useEffect(() => {
    if (isPresent || exitsInstantly || isExited) return;
    const mine = () => releaseExitRef.current();
    const older = releaseOlderExit;
    releaseOlderExit = mine;
    if (older) older();
    return () => {
      if (releaseOlderExit === mine) releaseOlderExit = null;
    };
  }, [isPresent, exitsInstantly, isExited]);

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

  // Fallback timer in case animationend does not fire: duration + 80ms after the slide
  // started, or a longer grace if it never reports starting (e.g. a hidden WebView).
  useEffect(() => {
    const fallbackMs = motionStarted ? getTransitionDuration() + 80 : getTransitionDuration() + 1200;

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
  }, [isPresent, isAnimating, exitsInstantly, motionStarted]);

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
    ? exitRef.current!.cls
    : (isAnimating ? enterClass : "");

  const isPop = isPresent ? enteredAsPop : exitRef.current!.pop;

  // Z-Index logic:
  // - Pushing: Incoming (isPresent) is 10, Outgoing (!isPresent) is 1
  // - Popping: Incoming (isPresent) is 1, Outgoing (!isPresent) is 10
  const zIndex = isPop ? (isPresent ? 1 : 10) : (isPresent ? 10 : 1);

  return (
    <div
      ref={elRef}
      key={location.pathname}
      onAnimationStart={(e) => {
        if (e.target === elRef.current && e.animationName.startsWith("page")) setMotionStarted(true);
      }}
      onAnimationEnd={handleAnimationEnd}
      data-screen-layer
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
      {/* A screen that has finished leaving (or was switched away instantly) renders
          nothing. AnimatePresence only unmounts leaving screens once every exit has
          finished, so with quick taps released screens used to stay mounted, hidden
          but holding their whole tree, data and memory, until the WebView crashed. */}
      {isExited || exitsInstantly ? null : children}
    </div>
  );
};

export default PageTransition;
