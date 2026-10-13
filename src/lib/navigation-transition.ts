export const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

let previousPathname = typeof window !== "undefined" ? window.location.pathname : "/home";
let currentPathname = typeof window !== "undefined" ? window.location.pathname : "/home";
let currentNavType: "PUSH" | "POP" | "REPLACE" = "PUSH";

/**
 * Record every route change to accurately track stack vs tab transitions.
 */
export function recordNavigation(pathname: string, navType: "PUSH" | "POP" | "REPLACE") {
  if (pathname !== currentPathname) {
    previousPathname = currentPathname;
    currentPathname = pathname;
    currentNavType = navType;
  }
}

/**
 * True ONLY when switching directly between two root tabs (e.g. Home <-> Bookings).
 */
export function isTabToTabTransition(): boolean {
  return TAB_PATHS.includes(previousPathname) && TAB_PATHS.includes(currentPathname);
}

/**
 * Get the navigation type (PUSH, POP, or REPLACE).
 * When navigating between tabs: moving right in the bar is PUSH (slides from right),
 * moving left is POP (slides from left), providing consistent physical slides everywhere.
 * When returning from any detail screen/subpage back to a root tab, it acts as POP
 * so the sheet always slides out smoothly to the right.
 */
export function getEffectiveNavType(): "PUSH" | "POP" | "REPLACE" {
  if (isTabToTabTransition()) {
    const prevIdx = TAB_PATHS.indexOf(previousPathname);
    const currIdx = TAB_PATHS.indexOf(currentPathname);
    return currIdx < prevIdx ? "POP" : "PUSH";
  }

  // Returning from a subpage back to a root tab acts as a POP exit slide
  if (TAB_PATHS.includes(currentPathname) && !TAB_PATHS.includes(previousPathname)) {
    return "POP";
  }

  return currentNavType;
}

/**
 * Determines the pure compositor GPU CSS class for both entering and exiting screens.
 * Provides the identical, buttery 120fps slide-in and slide-out animation across the entire app.
 */
export function getTransitionClass(isPresent: boolean): string {
  const isPop = getEffectiveNavType() === "POP";

  if (isPop) {
    return isPresent ? "page-anim-pop" : "page-anim-pop-exit";
  }

  return isPresent ? "page-anim-push" : "page-anim-push-exit";
}

/**
 * Returns the exact duration in ms for the active transition.
 */
export function getTransitionDuration(): number {
  return 350;
}

// ==========================================
// Transition Settle Gate
// ==========================================
let activeTransitions = 0;
const settledCallbacks: Array<() => void> = [];
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

export function isTransitioning(): boolean {
  return activeTransitions > 0;
}

function flushSettledCallbacks(): void {
  if (watchdogTimer !== null) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  const callbacks = settledCallbacks.splice(0, settledCallbacks.length);
  for (const cb of callbacks) {
    try {
      cb();
    } catch (e) {
      console.error("Error in whenTransitionSettled callback:", e);
    }
  }
}

export function beginTransition(): void {
  activeTransitions++;
  if (watchdogTimer !== null) {
    clearTimeout(watchdogTimer);
  }
  // 1.5s watchdog so work can never be blocked forever
  watchdogTimer = setTimeout(() => {
    if (activeTransitions > 0) {
      activeTransitions = 0;
      flushSettledCallbacks();
    }
  }, 1500);
}

export function endTransition(): void {
  if (activeTransitions > 0) {
    activeTransitions--;
  }
  if (activeTransitions === 0) {
    flushSettledCallbacks();
  }
}

export function whenTransitionSettled(cb: () => void): () => void {
  if (!isTransitioning()) {
    cb();
    return () => {};
  }
  settledCallbacks.push(cb);
  return () => {
    const idx = settledCallbacks.indexOf(cb);
    if (idx !== -1) {
      settledCallbacks.splice(idx, 1);
    }
  };
}
