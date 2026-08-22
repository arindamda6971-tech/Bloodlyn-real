import { ReactNode, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import BottomNavigation from "./BottomNavigation";
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
  className = "",
  onRefresh,
  enablePullToRefresh = true,
}: MobileLayoutProps) => {
  const queryClient = useQueryClient();

  const defaultRefresh = useCallback(async () => {
    // Native-feeling refresh: refetch all active queries on the current screen
    // instead of doing a full WebView reload.
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const handleRefresh = onRefresh || defaultRefresh;

  const content = (
    <main
      className={`${showNav ? "pb-24" : ""} ${className}`}
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        contain: 'layout style',
      }}
    >
      {children}
    </main>
  );

  return (
    <div
      className="min-h-[100dvh] h-[100dvh] bg-background w-full md:max-w-[430px] mx-auto relative overflow-hidden pt-safe"
      style={{
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {enablePullToRefresh ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        <div
          data-scroll-container=""
          className="h-full overflow-y-auto overscroll-y-none"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >

          {content}
        </div>
      )}
      {showNav && <BottomNavigation />}
    </div>
  );
};

export default MobileLayout;
