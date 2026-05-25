import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Smooth crossfade + subtle slide between routes.
 * Keyed by pathname so React Router's outlet swap animates rather than blanks.
 * Also implements a tiny in-memory "back/forward cache": when navigating back to
 * a recently visited route, the previous rendered tree is reused instantly
 * before the live tree replaces it, giving the feel of instant nav.
 */
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const cacheRef = useRef<Map<string, ReactNode>>(new Map());
  const [, force] = useState(0);

  // Track up to last 6 page snapshots for instant back/forward feel.
  useEffect(() => {
    const key = location.pathname + location.search;
    const cache = cacheRef.current;
    cache.set(key, children);
    if (cache.size > 6) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    force((n) => n + 1);
  }, [location.pathname, location.search, children]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 30,
          mass: 1,
        }}
        style={{
          willChange: "opacity, transform",
          width: "100%",
          position: "relative"
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
