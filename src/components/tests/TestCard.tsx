import { memo, type ReactNode } from "react";
import { Check, House, Plus, TestTube2, type LucideIcon } from "lucide-react";
import type { CatalogueTest } from "@/hooks/useTestCatalogue";
import { getTestDisplayName } from "@/lib/test-display";

interface TestCardProps {
  test: CatalogueTest;
  inCart: boolean;
  /** Category name under the chips (search results span categories). */
  categoryLabel?: string;
  onOpen: (test: CatalogueTest) => void;
  onAdd: (test: CatalogueTest) => void;
  onOpenCart: () => void;
}

// Samples a phlebotomist can collect at home. Biopsies, CSF, marrow etc. need a
// hospital, so those tests never claim a home visit.
const HOME_SAMPLE = /\b(serum|plasma|blood|edta|fluoride|citrate|heparin|urine|stool|saliva|swab|sputum|semen)\b/i;
const HOSPITAL_ONLY = /\b(csf|biopsy|tissue|marrow|synovial|pleural|peritoneal|ascitic|amniotic|aspirate|pericardial)\b/i;

const Chip = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => (
  <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11.5px] font-medium text-foreground/70">
    <Icon className="h-3 w-3 shrink-0" strokeWidth={2} />
    <span className="truncate">{children}</span>
  </span>
);

/** One test as its own card: bold name, sample and home-visit chips, and a filled Add button. */
const TestCard = memo(({ test, inCart, categoryLabel, onOpen, onAdd, onOpenCart }: TestCardProps) => {
  const { title, specimen } = getTestDisplayName(test.display_name || test.test_name);
  const homeVisit = !!specimen && HOME_SAMPLE.test(specimen) && !HOSPITAL_ONLY.test(specimen);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(test)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(test);
        }
      }}
      className="cursor-pointer rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-transform duration-100 active:scale-[0.99]"
      style={{ contain: "content" }}
    >
      <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{title}</p>

      {(specimen || homeVisit) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {specimen && <Chip icon={TestTube2}>{specimen}</Chip>}
          {homeVisit && <Chip icon={House}>Home visit</Chip>}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[12px] text-muted-foreground">{categoryLabel}</span>
        <button
          type="button"
          aria-label={inCart ? "Added to cart, open cart" : `Add ${title} to cart`}
          onClick={(e) => {
            e.stopPropagation();
            if (inCart) onOpenCart();
            else onAdd(test);
          }}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-4 text-[13.5px] font-semibold transition-transform duration-100 active:scale-95 ${
            inCart ? "bg-success/10 text-success" : "bg-primary text-primary-foreground shadow-sm"
          }`}
        >
          {inCart ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
          {inCart ? "Added" : "Add"}
        </button>
      </div>
    </div>
  );
});

TestCard.displayName = "TestCard";

/** Vertical stack of TestCards. */
export const TestList = ({ children }: { children: ReactNode }) => <div className="space-y-3">{children}</div>;

export const TestListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <TestList>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-3 flex gap-1.5">
          <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="mt-3 flex justify-end">
          <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    ))}
  </TestList>
);

export default TestCard;
