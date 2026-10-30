import { memo } from "react";
import { HealthConcernIcon } from "./HealthConcernIcons";

/**
 * "Shop by health concern" — the entry point diagnostics apps lead with.
 * Static (no database call): each concern runs a Home search for its key tests,
 * so it keeps working whatever categories the labs publish.
 *
 * Icons: soft-3D SVG set drawn for BloodLyn (HealthConcernIcons.tsx): sharp at any
 * size, no image downloads.
 */
const CONCERNS = [
  // `search` is an intent the search intelligence understands (see lib/test-knowledge.ts).
  { label: "Diabetes", icon: "diabetes", search: "diabetes" },
  { label: "Heart", icon: "heart", search: "heart" },
  { label: "Thyroid", icon: "thyroid", search: "thyroid" },
  { label: "Lungs", icon: "lungs", search: "lungs" },
  { label: "Vitamins", icon: "vitamins", search: "vitamins" },
  { label: "Fever", icon: "fever", search: "fever" },
  { label: "Bones", icon: "bones", search: "bones" },
  { label: "Full body", icon: "full_body", search: "full body checkup" },
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
            <HealthConcernIcon name={icon} className="w-12 h-12" />
          </span>
          <span className="text-[12px] font-semibold text-foreground/90 leading-tight text-center">{label}</span>
        </button>
      ))}
    </div>
  </section>
));

HealthConcernsGrid.displayName = "HealthConcernsGrid";

export default HealthConcernsGrid;
