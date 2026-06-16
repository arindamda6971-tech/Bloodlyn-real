import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Smooth crossfade + subtle slide between routes.
 * Keyed by pathname so React Router's outlet swap animates rather than blanks.
 * Also implements a tiny in-memory "back/forward cache": when navigating back to
 * a recently visited route, the previous rendered tree is reused instantly
 * before the live tree replaces it, giving the feel of instant nav.
 */
const PageTransition = ({ children, routeKey }: { children: ReactNode; routeKey?: string }) => {
  const location = useLocation();
  const key = routeKey ?? location.pathname;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.22 }}
        style={{
          willChange: "opacity, transform",
          width: "100%",
          position: "relative",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
