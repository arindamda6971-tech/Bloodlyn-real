import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SPECIALTIES, type DoctorSort } from "@/lib/doctor-finder";

const SORTS: Array<{ key: DoctorSort; label: string }> = [
  { key: "recommended", label: "Recommended" },
  { key: "fee", label: "Lowest fee" },
  { key: "experience", label: "Most experienced" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialty: string | null;
  sort: DoctorSort;
  /** How many doctors each specialty has right now; specialties with none are greyed. */
  counts: Record<string, number>;
  onApply: (specialty: string | null, sort: DoctorSort) => void;
}

/** Every specialty and the sort order, from the filter button in the corner. */
export function DoctorFilterSheet({ open, onOpenChange, specialty, sort, counts, onApply }: Props) {
  const [pickedSpecialty, setPickedSpecialty] = useState(specialty);
  const [pickedSort, setPickedSort] = useState(sort);

  useEffect(() => {
    if (open) {
      setPickedSpecialty(specialty);
      setPickedSort(sort);
    }
  }, [open, specialty, sort]);

  const chip = (active: boolean) =>
    `rounded-2xl border px-3.5 py-2.5 text-left text-[13px] font-bold transition-colors ${
      active ? "border-primary bg-primary/10 text-primary" : "border-border/70 bg-card text-foreground"
    }`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[88vh] flex-col rounded-t-3xl p-0">
        <SheetHeader className="border-b border-border/40 px-5 pb-4 pt-6 text-left">
          <SheetTitle className="text-lg">Filter doctors</SheetTitle>
          <SheetDescription>Choose a specialty, or keep all doctors.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="mb-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground">Sort by</h3>
            <div className="grid grid-cols-3 gap-2">
              {SORTS.map((s) => (
                <button key={s.key} type="button" aria-pressed={pickedSort === s.key} onClick={() => setPickedSort(s.key)} className={`${chip(pickedSort === s.key)} !px-2 text-center !text-xs`}>
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground">Specialty</h3>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={pickedSpecialty === null} onClick={() => setPickedSpecialty(null)} className={`${chip(pickedSpecialty === null)} flex items-center justify-between`}>
                All doctors {pickedSpecialty === null && <Check className="h-4 w-4" />}
              </button>
              {SPECIALTIES.map((s) => {
                const n = counts[s.key] ?? 0;
                const active = pickedSpecialty === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPickedSpecialty(s.key)}
                    className={`${chip(active)} flex items-center justify-between gap-2 ${n === 0 && !active ? "opacity-50" : ""}`}
                  >
                    <span className="min-w-0 truncate">{s.label}</span>
                    {active ? <Check className="h-4 w-4 shrink-0" /> : <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{n}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex gap-3 border-t border-border/50 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Button variant="outline" className="h-12 flex-1 rounded-2xl font-bold" onClick={() => onApply(null, "recommended")}>
            Clear
          </Button>
          <Button className="h-12 flex-[2] rounded-2xl font-bold" onClick={() => onApply(pickedSpecialty, pickedSort)}>
            Show doctors
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
