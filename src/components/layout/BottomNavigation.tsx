import { Home, Grid3X3, ShoppingBag, FileText, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Grid3X3, label: "Tests", path: "/categories" },
  { icon: ShoppingBag, label: "My Orders", path: "/bookings" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[430px] mx-auto bg-white/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-8px_32px_rgba(0,0,0,0.05)]">
      <div
        className="flex items-center justify-around px-2 py-[10px]"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 6px)',
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-1.5 py-1 px-3 min-w-[70px] active:scale-[0.9] transition-transform duration-200"
            >
              <div className="relative p-2.5">
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-[1.2rem] -z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-muted-foreground/60"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-bold tracking-tight relative z-10 transition-colors duration-300 ${
                  isActive ? "text-primary" : "text-muted-foreground/60"
                }`}
              >
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -bottom-1.5 w-1 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
