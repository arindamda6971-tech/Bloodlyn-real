import React, { useState, useEffect } from "react";
import { Home, Grid3X3, ShoppingBag, FileText, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { hapticImpact } from "@/utils/haptics";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Grid3X3, label: "Tests", path: "/categories" },
  { icon: ShoppingBag, label: "My Orders", path: "/bookings" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNavigation = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
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
      className="fixed bottom-0 left-0 right-0 z-50 w-full md:max-w-[430px] mx-auto bg-card border-t border-border rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] select-none"
      style={{
        paddingBottom: 'calc(var(--sab) + 4px)',
        touchAction: 'manipulation'
      }}
    >
      <div className="flex items-center justify-between px-1.5 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => {
                // Native tap feedback (no-op on web)
                if (!isActive) void hapticImpact();
                navigate(item.path);
              }}
              className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 active:scale-[0.92] transition-transform duration-150"
            >
              <div
                className={`p-1.5 rounded-xl transition-colors duration-200 ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground/70 hover:bg-muted/50"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? "text-primary stroke-[2.2]" : "text-muted-foreground/70 stroke-[1.8]"
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
    </nav>
  );
});

BottomNavigation.displayName = "BottomNavigation";

export default BottomNavigation;
