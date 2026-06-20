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
  const defaultRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    window.location.reload();
  }, []);

  const handleRefresh = onRefresh || defaultRefresh;

  const content = (
    <main 
      className={`${showNav ? "pb-24" : ""} ${className}`}
      style={{
        willChange: 'scroll-position',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        /* Transition Isolation: Prevent re-paints of the background during transitions */
        contain: 'layout style',
      }}
    >
      {children}
    </main>
  );

  return (
    <div 
      className="min-h-[100dvh] h-[100dvh] bg-background w-full md:max-w-[430px] mx-auto relative overflow-hidden contain-strict"
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'none',
        /* Force 120Hz physics */
        scrollSnapType: 'y proximity',
      }}
    >
      {enablePullToRefresh ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        <div 
          className="h-full overflow-y-auto overscroll-y-none"
          style={{
            WebkitOverflowScrolling: 'touch',
            willChange: 'scroll-position',
            touchAction: 'pan-y',
            contain: 'content'
          }}
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
