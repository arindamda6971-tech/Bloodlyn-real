import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse, RefreshCw } from "lucide-react";
import { PackageCard } from "@/components/packages/PackageCard";
import { useActivePackages } from "@/hooks/useActivePackages";
import type { HealthPackage } from "@/lib/health-packages";

const MAX_ON_HOME = 8;

/** Home: popular packages in a sideways row; filters and sorting live on View all. */
const HealthPackagesSection = () => {
  const navigate = useNavigate();
  const { data: packages = [], isLoading, isError, isFetching, refetch } = useActivePackages();

  const shown = useMemo(() => packages.slice(0, MAX_ON_HOME), [packages]);
  const open = useCallback((p: HealthPackage) => navigate(`/package/${p.id}`), [navigate]);

  return (
    <section className="home-render-section mt-8 section-defer">
      <div className="px-4 flex items-center justify-between mb-3">
        <h2 className="text-[19px] font-extrabold text-foreground tracking-tight">Health packages</h2>
        {packages.length > 0 && (
          <button
            onClick={() => navigate("/packages")}
            className="text-primary text-xs font-black bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            View all ({packages.length})
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-3 px-4 overflow-hidden">
          <div className="h-[230px] w-[80vw] max-w-[310px] shrink-0 rounded-3xl bg-muted/40 animate-pulse" />
          <div className="h-[230px] w-[80vw] max-w-[310px] shrink-0 rounded-3xl bg-muted/40 animate-pulse" />
        </div>
      ) : isError && packages.length === 0 ? (
        <div className="mx-4 rounded-3xl border border-border/60 bg-muted/20 p-4 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-foreground">Couldn't load health packages</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 inline-flex items-center gap-1.5 text-primary text-xs font-black bg-primary/10 px-3 py-1.5 rounded-full disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Try again
          </button>
        </div>
      ) : packages.length === 0 ? (
        <div className="mx-4 rounded-3xl border border-dashed border-border/60 bg-muted/20 p-5 flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <HeartPulse className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-foreground leading-tight">No health packages yet</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 leading-snug">
              New packages from partner labs appear here as soon as they go live.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 pt-1 pb-2 scroll-px-4">
          {shown.map((p) => (
            <PackageCard key={p.id} pkg={p} onOpen={open} compact />
          ))}
        </div>
      )}
    </section>
  );
};

export default HealthPackagesSection;
