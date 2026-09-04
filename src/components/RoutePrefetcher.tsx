import { useEffect } from "react";

/**
 * RoutePrefetcher component.
 * Silently pre-downloads the Javascript chunks for the most critical screens 
 * in the background on idle, ensuring instant 0ms transitions.
 */
const RoutePrefetcher = () => {
  useEffect(() => {
    const prefetchRoutes = () => {
      // Import the most heavily visited routes so they are cached in memory
      import("../pages/HomeScreen");
      import("../pages/CategoriesScreen");
      import("../pages/CartScreen");
      import("../pages/ProfileScreen");
      import("../pages/BookingsScreen");
    };

    if ('requestIdleCallback' in window) {
      // Wait for the main thread to be completely idle before fetching
      (window as any).requestIdleCallback(prefetchRoutes, { timeout: 2000 });
    } else {
      // Fallback for Safari
      setTimeout(prefetchRoutes, 3000);
    }
  }, []);

  return null;
};

export default RoutePrefetcher;
