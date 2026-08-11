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

    // Swap immediately inside a transition: React keeps the old page painted
    // while the next chunk resolves, so there is no timer latency and no
    // extra frame spent waiting before navigation starts.
    startTransition(() => {
      setDeferred(location);
    });
  }, [location, deferred.pathname, deferred.search]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children(deferred)}
    </div>
  );

};

export default SmoothRoutes;
