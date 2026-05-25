import { Home, Grid3X3, ShoppingBag, FileText, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Grid3X3, label: "Tests", path: "/categories" },
  { icon: ShoppingBag, label: "Orders", path: "/bookings" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-between bg-black/80 backdrop-blur-2xl px-3 py-3 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-[400px]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex items-center justify-center group"
              style={{ width: isActive ? '32%' : '15%' }}
            >
              <motion.div
                layout
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full transition-all duration-500 ${
                  isActive
                    ? "bg-primary text-white w-full shadow-[0_8px_20px_rgba(74,179,244,0.4)]"
                    : "text-white/40 hover:text-white/60 w-12 h-12"
                }`}
              >
                <Icon className={`${isActive ? 'w-5 h-5' : 'w-6 h-6'} shrink-0`} />
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-xs font-black tracking-tight whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Subtle active glow */}
              {isActive && (
                <motion.div
                  layoutId="active-glow"
                  className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full blur-[2px]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNavigation;
