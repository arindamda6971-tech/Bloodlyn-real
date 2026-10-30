import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HeartPulse, ArrowUpDown } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { PackageCard } from "@/components/packages/PackageCard";
import { PackageCategoryChips } from "@/components/packages/PackageCategoryChips";
import { useSEO } from "@/hooks/useSEO";
import {
  ACTIVE_PACKAGES_QUERY_KEY,
  categoriesWithPackages,
  fetchActivePackages,
  sortPackages,
  type HealthPackage,
  type PackageSort,
} from "@/lib/health-packages";

const SORTS: { value: PackageSort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
  { value: "most_tests", label: "Most tests" },
];

const PackagesScreen = () => {
  useSEO({ title: "Health Packages | BloodLyn", description: "Health checkup packages from partner labs, with home sample collection." });
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState<PackageSort>("popular");
  const category = params.get("category");

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ACTIVE_PACKAGES_QUERY_KEY,
    queryFn: fetchActivePackages,
    staleTime: 5 * 60 * 1000,
  });

  const chips = useMemo(() => categoriesWithPackages(packages), [packages]);
  const shown = useMemo(
    () => sortPackages(category ? packages.filter((p) => p.category === category) : packages, sort),
    [packages, category, sort],
  );
  const setCategory = (value: string | null) =>
    setParams(value ? { category: value } : {}, { replace: true });
  const open = useCallback((p: HealthPackage) => navigate(`/package/${p.id}`), [navigate]);

  return (
    <MobileLayout>
      <ScreenHeader title="Health Packages" />
      <div className="pt-3 pb-6">
        {chips.length > 1 && <PackageCategoryChips chips={chips} value={category} onChange={setCategory} />}

        {packages.length > 0 && (
          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              {shown.length} {shown.length === 1 ? "package" : "packages"}
            </p>
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
              <span className="sr-only">Sort by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as PackageSort)}
                className="bg-transparent font-bold focus:outline-none"
              >
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
        )}

        <div className="px-4 space-y-3">
          {isLoading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-[180px] rounded-3xl bg-muted/40 animate-pulse" />)
          ) : shown.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
              <HeartPulse className="w-8 h-8 text-primary mx-auto" />
              <p className="mt-3 text-sm font-extrabold text-foreground">No packages here yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {category ? "Try another category." : "New packages from partner labs appear here as soon as they go live."}
              </p>
            </div>
          ) : (
            shown.map((p) => <PackageCard key={p.id} pkg={p} onOpen={open} />)
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default PackagesScreen;
