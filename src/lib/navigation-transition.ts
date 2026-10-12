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
 */
export function getEffectiveNavType(): "PUSH" | "POP" | "REPLACE" {
  return currentNavType;
}

/**
 * Determines the pure compositor GPU CSS class for both entering and exiting screens.
 */
export function getTransitionClass(isPresent: boolean): string {
  const isTab = isTabToTabTransition();
  const isPop = currentNavType === "POP";

  if (isTab) {
    return isPresent ? "page-anim-fade" : "page-anim-fade-exit";
  }

  if (isPop) {
    return isPresent ? "page-anim-pop" : "page-anim-pop-exit";
  }

  return isPresent ? "page-anim-push" : "page-anim-push-exit";
}

/**
 * Returns the exact duration in ms for the active transition.
 */
export function getTransitionDuration(): number {
  return isTabToTabTransition() ? 250 : 350;
}
