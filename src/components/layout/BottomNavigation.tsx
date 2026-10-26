import React, { useState, useEffect, useId } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { Home, Grid3X3, ShoppingBag, FileText, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { hapticImpact } from "@/utils/haptics";
import { TAB_PATHS } from "@/lib/navigation-transition";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Grid3X3, label: "Tests", path: "/categories" },
  { icon: ShoppingBag, label: "My Orders", path: "/bookings" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface BottomNavigationProps {
  zIndex?: number;
}

const BottomNavigation = React.memo(({ zIndex = 50 }: BottomNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  // Scopes the sliding pill to this bar, so an in-page bar never animates against the app-wide one.
  const layoutGroupId = useId();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setIsKeyboardOpen(heightDiff > 140);
      }
    };
    window.visualViewport.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  if (isKeyboardOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 w-full md:max-w-[430px] mx-auto bg-card border-t border-border rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] select-none"
      style={{
        zIndex,
        paddingBottom: 'calc(var(--sab) + 4px)',
        touchAction: 'manipulation'
      }}
    >
      <LayoutGroup id={layoutGroupId}>
      <div className="flex items-center justify-between px-1.5 py-1">
        {navItems.map((item) => {
          const isActive = item.path === "/categories"
            ? location.pathname === "/categories" || location.pathname === "/category-tests"
            : location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => {
                // Re-tapping the current tab must not push a duplicate history entry.
                if (location.pathname === item.path) return;
                // Native tap feedback (no-op on web)
                if (!isActive) void hapticImpact();
                // Leaving Home pushes one entry; later tab hops replace it, so the
                // history never grows with every tap and Back always lands on Home.
                const onHome = location.pathname === "/home";
                const onTab = TAB_PATHS.includes(location.pathname);
                const cameFromHome = (location.state as { fromHomeTab?: boolean } | null)?.fromHomeTab === true;
                if (item.path === "/home" && onTab && cameFromHome) {
                  navigate(-1);
                  return;
                }
                navigate(item.path, {
                  replace: onTab && !onHome,
                  state: onHome || (onTab && cameFromHome) ? { fromHomeTab: true } : undefined,
                });
              }}
              className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 active:scale-[0.92] transition-transform duration-150"
            >
              <div
                className={`relative p-1.5 rounded-xl transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground/70 hover:bg-muted/50"
                }`}
              >
                {isActive && (
                  // One shared pill that glides to the tapped tab (Material 3 style).
                  <motion.span
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.8 }}
                  />
                )}
                <Icon
                  className={`relative w-5 h-5 transition-[color,transform] duration-200 ease-out ${
                    isActive ? "text-primary stroke-[2.2] scale-110" : "text-muted-foreground/70 stroke-[1.8]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold transition-colors duration-200 truncate max-w-full leading-tight ${
                  isActive ? "text-primary" : "text-muted-foreground/70"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      </LayoutGroup>
    </nav>
  );
});

BottomNavigation.displayName = "BottomNavigation";

export default BottomNavigation;
