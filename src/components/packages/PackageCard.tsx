import { memo } from "react";
import { Building2, Clock, FlaskConical, Utensils } from "lucide-react";
import type { HealthPackage } from "@/lib/health-packages";
import { fastingText, includedPreview, reportText } from "@/lib/health-packages";

interface Props {
  pkg: HealthPackage;
  onOpen: (pkg: HealthPackage) => void;
  /** Fixed width for the Home carousel; full width in lists. */
  compact?: boolean;
}

/** A package as people shop for it: what it is, what's inside, price, then the lab. */
export const PackageCard = memo(({ pkg, onOpen, compact }: Props) => {
  const preview = includedPreview(pkg);
  const report = reportText(pkg);
  return (
    <button
      type="button"
      onClick={() => onOpen(pkg)}
      className={`relative text-left bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-border/40 active:scale-[0.99] transition-transform flex flex-col ${
        compact ? "w-[78vw] max-w-[300px] shrink-0 snap-start" : "w-full"
      }`}
    >
      {pkg.isPopular && (
        <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          Popular
        </span>
      )}
      <p className={`text-[15px] font-extrabold text-foreground leading-snug line-clamp-2 ${pkg.isPopular ? "pr-16" : ""}`}>{pkg.name}</p>

      <p className="mt-1 text-[12px] text-muted-foreground font-semibold flex items-center gap-1.5">
        <FlaskConical className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="line-clamp-1">
          {pkg.testsCount} {pkg.testsCount === 1 ? "test" : "tests"}
          {preview ? ` · ${preview}` : ""}
        </span>
      </p>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Utensils className="w-3 h-3" />{fastingText(pkg)}</span>
        {report && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{report}</span>}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-foreground">₹{Math.round(pkg.price)}</span>
            {pkg.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">₹{Math.round(pkg.originalPrice)}</span>
            )}
            {pkg.discountPercent > 0 && (
              <span className="text-[11px] font-black text-emerald-600">{pkg.discountPercent}% off</span>
            )}
          </div>
          {pkg.lab && (
            <p className="mt-0.5 text-[11px] text-muted-foreground font-semibold flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{pkg.lab.name}</span>
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold px-4 py-2">View</span>
      </div>
    </button>
  );
});

PackageCard.displayName = "PackageCard";
