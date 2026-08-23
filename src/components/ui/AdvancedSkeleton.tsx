import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

type SkeletonType = "home-hero" | "category-grid" | "lab-card" | "test-card" | "profile-header";

interface AdvancedSkeletonProps {
  type: SkeletonType;
  count?: number;
  className?: string;
}

export const AdvancedSkeleton = ({ type, count = 1, className }: AdvancedSkeletonProps) => {
  const renderSkeleton = () => {
    switch (type) {
      case "home-hero":
        return (
          <div className="w-full space-y-4">
            <Skeleton className="h-40 w-full rounded-3xl" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-32 shrink-0 rounded-2xl" />
              ))}
            </div>
          </div>
        );

      case "category-grid":
        return (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(count * 4)].map((_, i) => (
              <div key={i} className="space-y-2 flex flex-col items-center">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <Skeleton className="h-3 w-12 rounded-full" />
              </div>
            ))}
          </div>
        );

      case "lab-card":
        return (
          <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="p-4 rounded-3xl border border-border/50 bg-card/50 flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-full" />
                  <Skeleton className="h-3 w-1/2 rounded-full opacity-60" />
                </div>
                <Skeleton className="h-8 w-16 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        );

      case "test-card":
        return (
          <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="p-5 rounded-[2rem] bg-card border border-border/40 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-2/3 rounded-full" />
                    <Skeleton className="h-3 w-1/3 rounded-full opacity-60" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full opacity-40" />
                  <Skeleton className="h-6 w-24 rounded-full opacity-40" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-10 w-28 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        );

      case "profile-header":
        return (
          <div className="flex items-center gap-4 p-6">
            <Skeleton className="h-20 w-20 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-1/2 rounded-full" />
              <Skeleton className="h-4 w-1/3 rounded-full opacity-60" />
            </div>
          </div>
        );

      default:
        return <Skeleton className="h-20 w-full" />;
    }
  };

  return (
    <div className={cn("animate-in fade-in duration-500", className)}>
      {renderSkeleton()}
    </div>
  );
};
