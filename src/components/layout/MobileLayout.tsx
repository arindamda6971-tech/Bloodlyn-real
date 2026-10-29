import { ReactNode, useContext } from "react";
import { useLocation } from "react-router-dom";
import BottomNavigation from "./BottomNavigation";
import { ScreenPathContext } from "./screen-path-context";
import { hasPersistentBottomNav } from "@/lib/navigation-transition";

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showFloatingAdd?: boolean;
  className?: string;
}

/**
 * Screen shell: one plain scroll container. There is deliberately no
 * pull-to-refresh — it dragged pages down while people scrolled or typed, and
 * the data refreshes on its own (realtime, refetch on focus).
 */
const MobileLayout = ({
  children,
  showNav = true,
  className = "",
}: MobileLayoutProps) => {
  const location = useLocation();
  const pathname = useContext(ScreenPathContext) ?? location.pathname;
  // On these screens the app-wide bar (outside the page layers) is the one shown;
  // a second copy in here would slide in with the page and stack on top of it.
  const renderOwnNav = showNav && !hasPersistentBottomNav(pathname);

  return (
    <div
      className="min-h-[100dvh] h-[100dvh] bg-background w-full md:max-w-[430px] mx-auto relative overflow-hidden"
      style={{
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
        paddingTop: 'var(--sat)',
      }}
    >
      <div
        data-scroll-container=""
        className="h-full overflow-y-auto overscroll-y-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
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
      </div>
      {renderOwnNav && <BottomNavigation />}
    </div>
  );
};

export default MobileLayout;
