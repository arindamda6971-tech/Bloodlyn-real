import { AdvancedSkeleton } from "@/components/ui/AdvancedSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Advanced Skeleton Fallback shown during lazy-route chunk loads.
 * Mimics the actual page structure (Header + Content + Nav) to eliminate
 * visual layout shifts, making transitions feel "Ultra Smooth".
 */
const RouteFallback = () => {
  return (
    <div className="min-h-screen bg-background w-full md:max-w-[430px] mx-auto px-4 pb-24 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="pt-12 pb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-full opacity-40" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      <div className="space-y-8 mt-4">
        {/* Hero/Banner Skeleton */}
        <AdvancedSkeleton type="home-hero" />

        {/* Content Blocks */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full opacity-40" />
          </div>
          <AdvancedSkeleton type="category-grid" count={1} />
        </div>

        <div className="space-y-4 pt-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <AdvancedSkeleton type="test-card" count={2} />
        </div>
      </div>
    </div>
  );
};

export default RouteFallback;
