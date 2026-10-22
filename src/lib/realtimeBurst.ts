/**
 * Collapse a burst of realtime events into one refresh.
 *
 * Partner Pro syncs a lab's whole catalogue at once (e.g. every time the lab
 * opens its dashboard), so a single sync can fire dozens of `products` /
 * `diagnostic_centers` row events. Refreshing on every event made every open
 * app re-download the same lists dozens of times in a row — a big share of the
 * database egress. Waiting for the burst to settle keeps the UI fresh (about
 * `waitMs` behind) while doing the download once.
 */
export const REALTIME_BURST_MS = 2_000;

export function createBurstDebouncer(fn: () => void, waitMs = REALTIME_BURST_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    trigger() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, waitMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
