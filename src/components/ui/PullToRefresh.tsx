import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

const CIRC = 251;

/**
 * Native-feeling pull-to-refresh.
 *
 * The drag is driven by direct DOM writes inside a single requestAnimationFrame
 * per touch frame — no React state updates while the finger moves — so the
 * gesture never triggers a re-render of the wrapped screen and stays at 60fps.
 * React state is used only for the coarse "refreshing" flag.
 */
const PullToRefresh = ({ children, onRefresh, threshold = 80 }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visible, setVisible] = useState(false);

  const startY = useRef(0);
  const isPulling = useRef(false);
  const distance = useRef(0);
  const raf = useRef<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const paint = useCallback(
    (d: number, animate: boolean) => {
      const progress = Math.min(d / threshold, 1);
      const content = containerRef.current;
      const indicator = indicatorRef.current;

      if (content) {
        content.style.transition = animate ? "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
        content.style.transform = `translate3d(0, ${d}px, 0)`;
      }
      if (indicator) {
        indicator.style.transition = animate ? "opacity 0.3s ease, transform 0.3s ease" : "none";
        indicator.style.top = `${Math.max(d - 40, -40)}px`;
        indicator.style.opacity = `${progress}`;
        indicator.style.transform = `translateX(-50%) scale(${0.5 + progress * 0.5})`;
      }
      if (progressRef.current) {
        progressRef.current.style.strokeDashoffset = `${CIRC - progress * CIRC}`;
      }
      if (iconRef.current) {
        iconRef.current.style.transform = `rotate(${progress * 180}deg)`;
      }
    },
    [threshold]
  );

  const schedule = useCallback(
    (d: number) => {
      if (raf.current !== null) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = null;
        paint(d, false);
      });
    },
    [paint]
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      if ((containerRef.current?.scrollTop || 0) !== 0) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
      distance.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      if ((containerRef.current?.scrollTop || 0) > 0) {
        isPulling.current = false;
        distance.current = 0;
        setVisible(false);
        paint(0, true);
        return;
      }
      const raw = e.touches[0].clientY - startY.current;
      if (raw <= 0) return;
      const damped = Math.min(Math.pow(raw, 0.4) * 3, threshold * 1.5);
      distance.current = damped;
      setVisible((v) => v || damped > 0);
      schedule(damped);
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      const d = distance.current;
      startY.current = 0;

      if (d >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        paint(threshold * 0.75, true);
        void (async () => {
          try {
            await onRefresh();
          } finally {
            distance.current = 0;
            paint(0, true);
            setIsRefreshing(false);
            setVisible(false);
          }
        })();
      } else {
        distance.current = 0;
        paint(0, true);
        setVisible(false);
      }
    };

    // Passive listeners: the browser never waits on JS to start scrolling.
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [isRefreshing, onRefresh, paint, schedule, threshold]);

  return (
    <div ref={rootRef} className="relative h-full overflow-hidden">
      {/* Pull indicator */}
      {(visible || isRefreshing) && (
        <div
          ref={indicatorRef}
          className="absolute left-1/2 z-50 flex items-center justify-center pointer-events-none"
          style={{ top: -40, opacity: 0, transform: "translateX(-50%) scale(0.5)", willChange: "transform, opacity" }}
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="absolute w-10 h-10 -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="2.5" />
              <circle
                ref={progressRef}
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC}
              />
            </svg>
            <div ref={iconRef} className="flex items-center justify-center">
              <RefreshCw
                className={`w-4 h-4 text-primary ${isRefreshing ? "animate-spin" : ""}`}
                strokeWidth={2.5}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content container */}
      <div
        ref={containerRef}
        data-scroll-container=""
        className="h-full overflow-y-auto overscroll-contain"
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
