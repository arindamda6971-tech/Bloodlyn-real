interface Chip {
  value: string;
  label: string;
}

interface Props {
  chips: readonly Chip[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/** "All · Full body · Diabetes · …" filter row; only categories that have packages are passed in. */
export function PackageCategoryChips({ chips, value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-3" role="tablist" aria-label="Package categories">
      {[{ value: null as string | null, label: "All" }, ...chips].map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value ?? "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c.value)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              active ? "bg-primary text-primary-foreground border-primary" : "bg-white text-foreground border-border/60"
            }`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
