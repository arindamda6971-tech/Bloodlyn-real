/**
 * Boot readiness signal.
 *
 * The HTML loader and the native Capacitor splash should disappear at the same
 * moment the first *real* screen is painted — not on an arbitrary timer. Screens
 * that own the cold-start decision (splash / auth gate) call `markAppReady()`
 * once they know what to show; the shell listens via `onAppReady()`.
 *
 * Purely a UI timing primitive: no data, no auth logic, no network.
 */

/**
 * True when this launch plays AppOpeningAnimation (first open of the session).
 * That screen hides the native splash itself once its logo is painted, so the
 * HTML loader / app-ready paths must not hide it earlier — doing so left a
 * blank white gap between the native logo and the web logo.
 * Must match the `bl_opening_shown` check in App.tsx.
 */
export const openingAnimationWillShow: boolean = (() => {
  try {
    return typeof window !== "undefined" && !sessionStorage.getItem("bl_opening_shown");
  } catch {
    return false;
  }
})();

let ready = false;
const listeners = new Set<() => void>();

export const isAppReady = () => ready;

export const markAppReady = () => {
  if (ready) return;
  console.log("App signaling readiness to hide boot loader");
  ready = true;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  });
  listeners.clear();
};

export const onAppReady = (fn: () => void) => {
  if (ready) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
};
