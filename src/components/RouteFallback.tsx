import { useEffect, useState } from "react";

/**
 * Suspense fallback shown during lazy-route chunk loads.
 * Delays its appearance ~120ms to avoid a flash of blank screen
 * on fast navigations (chunk already cached). Shows a subtle
 * branded spinner instead of a fully blank white page.
 */
const RouteFallback = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className={`min-h-screen bg-background flex items-center justify-center transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
};

export default RouteFallback;
