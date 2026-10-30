import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PackageCard } from "@/components/packages/PackageCard";
import { PackageCategoryChips } from "@/components/packages/PackageCategoryChips";
import {
  ACTIVE_PACKAGES_QUERY_KEY,
  categoriesWithPackages,
  fetchActivePackages,
  type HealthPackage,
} from "@/lib/health-packages";

const MAX_ON_HOME = 8;

/** Home: popular packages in a sideways row, with chips for the health concerns that have packages. */
const HealthPackagesSection = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string | null>(null);
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ACTIVE_PACKAGES_QUERY_KEY,
    queryFn: fetchActivePackages,
    staleTime: 5 * 60 * 1000,
  });

  const chips = useMemo(() => categoriesWithPackages(packages), [packages]);
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    packages.forEach((p) => { if (p.category) out[p.category] = (out[p.category] || 0) + 1; });
    return out;
  }, [packages]);
  const shown = useMemo(
    () => (category ? packages.filter((p) => p.category === category) : packages).slice(0, MAX_ON_HOME),
    [packages, category],
  );
  const open = useCallback((p: HealthPackage) => navigate(`/package/${p.id}`), [navigate]);

  return (
    <section className="home-render-section mt-8 section-defer">
      <div className="px-4 flex items-end justify-between mb-3">
        <div>
          <h2 className="text-[19px] font-extrabold text-foreground tracking-tight">Health packages</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">Bundled checkups, sample collected at home</p>
        </div>
        {packages.length > 0 && (
          <button
            onClick={() => navigate(category ? `/packages?category=${category}` : "/packages")}
            className="text-primary text-xs font-black bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            View all ({packages.length})
          </button>
        )}
      </div>

      {chips.length > 1 && <PackageCategoryChips chips={chips} value={category} onChange={setCategory} counts={counts} />}

      {isLoading ? (
        <div className="flex gap-3 px-4 overflow-hidden">
          <div className="h-[230px] w-[80vw] max-w-[310px] shrink-0 rounded-3xl bg-muted/40 animate-pulse" />
          <div className="h-[230px] w-[80vw] max-w-[310px] shrink-0 rounded-3xl bg-muted/40 animate-pulse" />
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
        <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 pt-1 pb-3 scroll-px-4">
          {shown.map((p) => (
            <PackageCard key={p.id} pkg={p} onOpen={open} compact />
          ))}
        </div>
      )}
    </section>
  );
};

export default HealthPackagesSection;
