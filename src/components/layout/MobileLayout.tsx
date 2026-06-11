import { ReactNode, useCallback, useEffect, useRef } from "react";
import BottomNavigation from "./BottomNavigation";
import FloatingAddButton from "./FloatingAddButton";
import PullToRefresh from "@/components/ui/PullToRefresh";

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showFloatingAdd?: boolean;
  className?: string;
  onRefresh?: () => Promise<void>;
  enablePullToRefresh?: boolean;
}

const MobileLayout = ({ 
  children, 
  showNav = true, 
  showFloatingAdd = true, 
  className = "",
  onRefresh,
  enablePullToRefresh = true,
}: MobileLayoutProps) => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const ticking = useRef(false);

  // Buttery smooth scroll optimization: passive listeners & requestAnimationFrame throttling
  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const mainEl = el.querySelector('main');
          if (mainEl && mainEl.style.pointerEvents !== 'none') {
            // Disable pointer events during scroll to boost FPS
            mainEl.style.pointerEvents = 'none';
          }
          if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
          scrollTimeout.current = setTimeout(() => {
            if (mainEl) mainEl.style.pointerEvents = 'auto';
          }, 150);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    // Use capture phase to catch scrolls from inner containers (like PullToRefresh)
    el.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      el.removeEventListener('scroll', handleScroll, { capture: true });
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  const defaultRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    window.location.reload();
  }, []);

  const handleRefresh = onRefresh || defaultRefresh;

  const content = (
    <main 
      className={`${showNav ? "pb-24" : ""} ${className}`}
      style={{
        willChange: 'transform, scroll-position',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </main>
  );

  return (
    <div 
      ref={layoutRef}
      className="min-h-[100dvh] h-[100dvh] bg-background max-w-[430px] mx-auto relative overflow-hidden contain-layout scroll-smooth"
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {enablePullToRefresh ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        <div 
          className="h-full overflow-y-auto overscroll-y-none"
          style={{ WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}
        >
          {content}
        </div>
      )}
      {showNav && <BottomNavigation />}
      {showFloatingAdd && <FloatingAddButton />}
    </div>
  );
};

export default MobileLayout;
