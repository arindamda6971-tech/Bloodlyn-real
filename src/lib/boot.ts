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

let ready = false;
const listeners = new Set<() => void>();

export const isAppReady = () => ready;

export const markAppReady = () => {
  if (ready) return;
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
