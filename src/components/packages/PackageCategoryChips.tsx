import { LayoutGrid } from "lucide-react";
import { categoryVisual } from "./packageVisuals";

interface Chip {
  value: string;
  label: string;
}

interface Props {
  chips: readonly Chip[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Packages per category, shown on each chip. */
  counts?: Record<string, number>;
}

/** "All · Full body · Diabetes · …" filter row; only categories that have packages are passed in. */
export function PackageCategoryChips({ chips, value, onChange, counts }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-3" role="tablist" aria-label="Package categories">
      {[{ value: null as string | null, label: "All" }, ...chips].map((c) => {
        const active = value === c.value;
        const Icon = c.value ? categoryVisual(c.value).icon : LayoutGrid;
        const count = c.value && counts ? counts[c.value] : undefined;
        return (
          <button
            key={c.value ?? "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c.value)}
            className={`shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-white text-foreground border-border/60"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${active ? "" : c.value ? categoryVisual(c.value).accent : "text-primary"}`} />
            {c.label}
            {count !== undefined && (
              <span className={`text-[10px] font-black ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
