import { cn } from "@/lib/utils";

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("soft-card shimmer min-h-[100px]", className)} />
);

export const LabSkeleton = () => (
  <div className="flex-shrink-0 w-[280px] h-[180px] rounded-3xl shimmer border border-border/40" />
);

export const OrderSkeleton = () => (
  <div className="w-56 h-32 rounded-3xl shimmer border border-border/40" />
);

export const ChipSkeleton = () => (
  <div className="w-20 h-8 rounded-full shimmer" />
);
