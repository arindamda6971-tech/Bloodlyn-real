import { ReactNode, useCallback, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import BottomNavigation from "./BottomNavigation";
import { ScreenPathContext } from "./screen-path-context";
import { hasPersistentBottomNav } from "@/lib/navigation-transition";
import PullToRefresh from "@/components/ui/PullToRefresh";
import RouteFallback from "@/components/RouteFallback";

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
  const location = useLocation();
  const pathname = useContext(ScreenPathContext) ?? location.pathname;
  // On these screens the app-wide bar (outside the page layers) is the one shown;
  // a second copy in here would slide in with the page and stack on top of it.
  const renderOwnNav = showNav && !hasPersistentBottomNav(pathname);

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
        WebkitOverflowScrolling: 'touch',
        contain: 'layout style',
      }}
    >
      {children}
    </main>
  );

  return (
    <div
      className="min-h-[100dvh] h-[100dvh] bg-background w-full md:max-w-[430px] mx-auto relative overflow-hidden"
      style={{
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
        paddingTop: 'var(--sat)',
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
      {renderOwnNav && <BottomNavigation />}
    </div>
  );
};

export default MobileLayout;
