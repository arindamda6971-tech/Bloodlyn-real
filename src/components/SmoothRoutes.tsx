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
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (deferred.pathname === location.pathname && deferred.search === location.search) return;
    startTransition(() => setDeferred(location));
  }, [location, deferred.pathname, deferred.search]);

  return <>{children(deferred)}</>;
};

export default SmoothRoutes;
