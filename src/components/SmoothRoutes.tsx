import { ReactNode, useEffect, useState, useTransition } from "react";
import { useLocation } from "react-router-dom";

/**
 * Defers route swaps with React 18's useTransition so the previous page
 * stays on screen while the next lazy chunk loads. Eliminates the blank
 * <Suspense fallback /> flash on slow native WebViews.
 */
const SmoothRoutes = ({ children }: { children: (loc: ReturnType<typeof useLocation>) => ReactNode }) => {
  const location = useLocation();
  const [deferred, setDeferred] = useState(location);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (deferred.pathname === location.pathname && deferred.search === location.search) return;

    // Tiny delay to allow background thread to breathe before heavy React swap
    const timeout = setTimeout(() => {
      startTransition(() => {
        setDeferred(location);
      });
    }, 10);

    return () => clearTimeout(timeout);
  }, [location, deferred.pathname, deferred.search]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        /* Keep page interactive and visible during transition */
        opacity: isPending ? 0.98 : 1,
        transition: 'opacity 0.2s ease'
      }}
    >
      {children(deferred)}
    </div>
  );
};

export default SmoothRoutes;
