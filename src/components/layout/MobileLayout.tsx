import { ReactNode, useCallback } from "react";
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
    <main className={`${showNav ? "pb-24" : ""} ${className}`}>
      {children}
    </main>
  );

  return (
    <div className="min-h-screen h-screen bg-background max-w-[430px] mx-auto relative overflow-hidden contain-layout">
      {enablePullToRefresh ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        <div className="h-full overflow-y-auto">
          {content}
        </div>
      )}
      {showNav && <BottomNavigation />}
      {showFloatingAdd && <FloatingAddButton />}
    </div>
  );
};

export default MobileLayout;
