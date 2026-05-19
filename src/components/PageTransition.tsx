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
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        style={{ willChange: "opacity, transform" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
