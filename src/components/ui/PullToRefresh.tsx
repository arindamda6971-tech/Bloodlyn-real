import { ReactNode, useCallback, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

const PullToRefresh = ({ children, onRefresh, threshold = 80 }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const distance = e.touches[0].clientY - startY.current;
    if (distance > 0) {
      const dampedDistance = Math.min(Math.pow(distance, 0.4) * 3, threshold * 1.5);
      setPullDistance(dampedDistance);
      if (distance > 10) e.preventDefault();
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.75);
      try {
        await onRefresh();
      } finally {
        setPullDistance(0);
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const isActive = pullDistance > 0 || isRefreshing;
  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      className="relative h-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {isActive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none"
          style={{
            top: Math.max(pullDistance - 40, -40),
            opacity: progress,
            transform: `translateX(-50%) scale(${0.5 + progress * 0.5})`,
            transition: isPulling.current ? 'none' : 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="absolute w-10 h-10 -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="2.5" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="251"
                strokeDashoffset={251 - progress * 251}
              />
            </svg>
            <RefreshCw
              className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
              style={!isRefreshing ? { transform: `rotate(${progress * 180}deg)` } : undefined}
              strokeWidth={2.5}
            />
          </div>
        </div>
      )}

      {/* Content container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain"
        style={{
          transform: isActive ? `translate3d(0, ${pullDistance}px, 0)` : 'translate3d(0, 0, 0)',
          transition: isPulling.current ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
