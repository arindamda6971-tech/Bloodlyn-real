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
     <nav className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[430px] mx-auto bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
       <div 
         className="flex items-center justify-around px-2 py-0"
         style={{
           paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 4px)',
         }}
       >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.92 }}
               className="relative flex flex-col items-center gap-1 py-1.5 px-4 min-w-[64px]"
            >
              <div
                 className={`p-2 rounded-2xl transition-all duration-300 ${
                  isActive 
                     ? "bg-primary/10" 
                    : "hover:bg-muted/50"
                }`}
              >
                <Icon
                   className={`w-5 h-5 transition-colors duration-300 ${
                     isActive ? "text-primary" : "text-muted-foreground/70"
                  }`}
                />
              </div>
              <span
                 className={`text-[10px] font-semibold transition-colors duration-300 ${
                   isActive ? "text-primary" : "text-muted-foreground/70"
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
