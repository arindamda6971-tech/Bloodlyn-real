import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Advanced Skeleton Fallback shown during lazy-route chunk loads.
 * Mimics the actual page structure (Header + Content + Nav) to eliminate
 * visual layout shifts, making transitions feel "Ultra Smooth".
 */
const RouteFallback = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto px-4 pb-24">
      {/* Header Skeleton */}
      <div className="pt-12 pb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Hero/Banner Skeleton */}
      <Skeleton className="h-40 w-full rounded-3xl mb-8" />

      {/* Content Blocks */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-4">
          <Skeleton className="h-6 w-40" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Bottom Nav Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t flex justify-around">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default RouteFallback;
