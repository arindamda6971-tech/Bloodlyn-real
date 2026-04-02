import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

const FloatingCartButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  
  // Hide on certain pages where it's not needed
  const hiddenPaths = ["/login", "/onboarding", "/splash", "/cart", "/tracking", "/lab-selection", "/payment"];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide || itemCount === 0) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 20 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate("/cart")}
      className="fixed right-4 w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center z-30"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        boxShadow: "0 4px 20px hsl(var(--primary) / 0.4)",
      }}
      aria-label="View cart"
    >
      <ShoppingCart className="w-5 h-5 text-primary-foreground" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </motion.button>
  );
};

export default FloatingCartButton;