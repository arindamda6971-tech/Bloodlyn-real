import { memo } from "react";

/**
 * "Shop by health concern" — the entry point diagnostics apps lead with.
 * Static (no database call): each concern runs the smart test search (see
 * lib/test-search.ts), which expands it to the tests for that concern.
 *
 * Icons: Microsoft Fluent Emoji 3D (MIT, see public/icons/3d/LICENSE-fluent-emoji.txt),
 * bundled as 144px WebP so they load instantly and offline.
 */
const CONCERNS = [
  { label: "Diabetes", icon: "drop-of-blood", search: "diabetes" },
  { label: "Heart", icon: "anatomical-heart", search: "heart" },
  { label: "Thyroid", icon: "butterfly", search: "thyroid" },
  { label: "Lungs", icon: "lungs", search: "lungs" },
  { label: "Vitamins", icon: "pill", search: "vitamins" },
  { label: "Fever", icon: "thermometer", search: "fever" },
  { label: "Bones", icon: "bone", search: "bone" },
  { label: "Full body", icon: "dna", search: "full body" },
] as const;

interface HealthConcernsGridProps {
  onSelect: (search: string) => void;
}

const HealthConcernsGrid = memo(({ onSelect }: HealthConcernsGridProps) => (
  <section className="home-render-section px-4 mt-8" style={{ contain: "content" }}>
    <h2 className="text-[19px] font-extrabold text-foreground tracking-tight mb-4">Shop by health concern</h2>
    <div className="grid grid-cols-4 gap-x-3 gap-y-5">
      {CONCERNS.map(({ label, icon, search }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(search)}
          className="flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150"
        >
          <span className="w-[68px] h-[68px] rounded-full bg-gradient-to-b from-sky-50 to-slate-100/80 ring-1 ring-slate-200/60 flex items-center justify-center">
            <img
              src={`/icons/3d/${icon}.webp`}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="w-10 h-10 object-contain"
            />
          </span>
          <span className="text-[12px] font-semibold text-foreground/90 leading-tight text-center">{label}</span>
        </button>
      ))}
    </div>
  </section>
));

HealthConcernsGrid.displayName = "HealthConcernsGrid";

export default HealthConcernsGrid;
