export const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

/**
 * Screens that show the bottom bar. The bar is rendered once, outside the sliding
 * page layers, so it stays put instead of riding in (and stacking) with each screen.
 * Keep in sync with the screens that render <MobileLayout> with the nav on.
 */
export const BOTTOM_NAV_PATHS = [
  ...TAB_PATHS,
  "/category-tests",
  "/packages",
  // Not /physio-consult: its "How It Works" intro hides the bar, and a shared
  // bar would cover the intro's button. That screen draws its own bar instead.
  "/ecg-doctors",
  "/terms",
  "/privacy",
  "/data-attribution",
];

/** Fade-through used when a bottom-bar tab comes in (see `pageTabEnter` in index.css). */
export const TAB_ENTER_CLASS = "page-anim-tab";

export function hasPersistentBottomNav(pathname: string): boolean {
  return BOTTOM_NAV_PATHS.includes(pathname);
}

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
 * Shorter on Capacitor (native APK) because Android WebView's compositor is
 * weaker than desktop Chrome — fewer frames = less chance of jank.
 */
let _isNative: boolean | null = null;
function isNativePlatform(): boolean {
  if (_isNative !== null) return _isNative;
  try {
    const isNat = typeof (window as any)?.Capacitor?.isNativePlatform === "function"
      ? (window as any).Capacitor.isNativePlatform()
      : false;
    _isNative = isNat;
    if (isNat && typeof document !== "undefined") {
      document.documentElement.style.setProperty("--page-transition-duration", "0.45s");
      document.documentElement.classList.add("native");
    }
    return isNat;
  } catch {
    return false;
  }
}

export function getTransitionDuration(): number {
  return 450;
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
  // No global class toggle here: a class on <html> forces a style recalc of the
  // entire document on the first and last frame of every slide, which janks mobile.
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
