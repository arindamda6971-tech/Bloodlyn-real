import { ReactNode, useEffect, useState } from "react";

interface DeferredMountProps {
  children: ReactNode;
  /** Reserved space while the content is not mounted yet (prevents layout shift). */
  minHeight?: number;
  /** Extra delay in ms after idle before mounting. */
  delay?: number;
}

/**
 * Mounts children only after the browser is idle, so below-the-fold sections
 * never compete with the route transition frame or the first paint.
 *
 * Purely a scheduling primitive — no data, no logic, no visual change once
 * mounted. A fixed-height placeholder holds the space to avoid reflow.
 */
const DeferredMount = ({ children, minHeight = 0, delay = 0 }: DeferredMountProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const mount = () => {
      if (delay > 0) {
        timer = window.setTimeout(() => setShow(true), delay);
      } else {
        setShow(true);
      }
    };

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;

    if (ric) {
      const id = ric(mount, { timeout: 500 });
      return () => {
        if (timer) clearTimeout(timer);
        (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }

    const raf = requestAnimationFrame(() => requestAnimationFrame(mount));
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [delay]);

  if (!show) return <div style={{ minHeight }} aria-hidden="true" />;
  return <>{children}</>;
};

export default DeferredMount;
