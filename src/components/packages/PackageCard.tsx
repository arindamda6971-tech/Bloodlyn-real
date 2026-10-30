import { memo } from "react";
import { ArrowRight, Building2, Clock, FlaskConical, Utensils } from "lucide-react";
import type { HealthPackage } from "@/lib/health-packages";
import { categoryLabel, coversPreview, formatHours, formatRupees, savings } from "@/lib/health-packages";
import { categoryVisual } from "./packageVisuals";

interface Props {
  pkg: HealthPackage;
  onOpen: (pkg: HealthPackage) => void;
  /** Fixed width for the Home carousel; full width in lists. */
  compact?: boolean;
}

/** A package as people shop for it: what it is and covers, how to prepare, the price, then the lab. */
export const PackageCard = memo(({ pkg, onOpen, compact }: Props) => {
  const visual = categoryVisual(pkg.category);
  const Icon = visual.icon;
  const covers = coversPreview(pkg);
  const saved = savings(pkg);
  const category = categoryLabel(pkg.category);

  return (
    <button
      type="button"
      onClick={() => onOpen(pkg)}
      aria-label={`${pkg.name}, ${formatRupees(pkg.price)}, ${pkg.lab?.name ?? ""}`}
      className={`relative text-left bg-white rounded-3xl overflow-hidden border border-border/50 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.18)] active:scale-[0.985] transition-transform flex flex-col ${
        compact ? "w-[80vw] max-w-[310px] shrink-0 snap-start" : "w-full"
      }`}
    >
      {/* Header: what kind of checkup it is */}
      <div className={`relative bg-gradient-to-br ${visual.tint} px-4 pt-4 pb-3`}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/90 shadow-sm flex items-center justify-center shrink-0">
            <Icon className={`w-5 h-5 ${visual.accent}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {category && (
                <span className={`text-[10px] font-black uppercase tracking-wider ${visual.accent}`}>{category}</span>
              )}
              {pkg.isPopular && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-400 text-white">
                  Popular
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[15px] font-extrabold text-foreground leading-snug line-clamp-2 break-words">{pkg.name}</p>
          </div>
        </div>
        {pkg.discountPercent > 0 && (
          <span className="absolute top-3 right-3 text-[10px] font-black px-2 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
            {pkg.discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Body: what's inside and how to prepare */}
      <div className="px-4 pt-3 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-bold">
            <FlaskConical className="w-3 h-3" />
            {pkg.testsCount} {pkg.testsCount === 1 ? "test" : "tests"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground/80">
            <Utensils className="w-3 h-3" />
            {pkg.fastingHours ? `${pkg.fastingHours} h fasting` : "No fasting"}
          </span>
          {pkg.reportHours && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground/80">
              <Clock className="w-3 h-3" />
              {formatHours(pkg.reportHours)}
            </span>
          )}
        </div>
        {covers && (
          <p className="mt-2 text-[12px] text-muted-foreground line-clamp-1">
            <span className="font-semibold text-foreground/70">Covers:</span> {covers}
          </p>
        )}
      </div>

      {/* Footer: price and lab */}
      <div className="mt-3 mx-4 mb-4 pt-3 border-t border-dashed border-border flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-black text-foreground leading-none">{formatRupees(pkg.price)}</span>
            {pkg.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatRupees(pkg.originalPrice)}</span>
            )}
          </div>
          {saved > 0 && <p className="mt-1 text-[11px] font-bold text-emerald-700">Save {formatRupees(saved)}</p>}
          {pkg.lab && (
            <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-semibold text-muted-foreground truncate">{pkg.lab.name}</span>
            </div>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-bold pl-3.5 pr-3 py-2">
          Details <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
});

PackageCard.displayName = "PackageCard";
