import { useEffect, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { LabAvatar, LabRating } from "@/components/labs/lab-display";
import { supabase } from "@/integrations/supabase/client";
import { labServesPincode, useUserPincode } from "@/hooks/useUserPincode";
import { formatRupees } from "@/lib/health-packages";
import { testTitle, type PrescriptionTest } from "@/lib/prescription";
import { simplifyTestName } from "@/utils/simplify-test-name";
import {
  labOptionsForPrescription,
  type PrescriptionLabOption,
  type PrescriptionLabProduct,
  type PrescriptionLabRow,
} from "@/lib/prescriptionLabs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tests: PrescriptionTest[];
  onChoose: (option: PrescriptionLabOption) => void;
}

/** The labs near the patient that do the prescribed tests, each with its own prices. */
export function PrescriptionLabSheet({ open, onOpenChange, tests, onChoose }: Props) {
  const { pincode } = useUserPincode();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [options, setOptions] = useState<PrescriptionLabOption[]>([]);
  // The tests by content, so a new array with the same tests doesn't fetch again.
  const testsKey = JSON.stringify(tests.map((t) => [t.id, t.name]));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const { data, error } = await supabase.from("diagnostic_centers").select("*").order("rating", { ascending: false });
        if (error) throw error;
        const labs = (data ?? []).filter((d) => labServesPincode(d as never, pincode)) as PrescriptionLabRow[];

        const vendorIds = labs.map((l) => l.vendor_id).filter((v): v is string => !!v);
        const productsByVendor: Record<string, PrescriptionLabProduct[]> = {};
        if (vendorIds.length > 0) {
          const { data: products, error: productsError } = await supabase
            .from("products")
            .select("*")
            .in("vendor_id", vendorIds)
            .eq("availability", true);
          if (productsError) throw productsError;
          for (const p of (products ?? []) as PrescriptionLabProduct[]) {
            (productsByVendor[p.vendor_id] ??= []).push(p);
          }
        }
        if (!cancelled) setOptions(labOptionsForPrescription(tests, labs, productsByVendor));
      } catch (e) {
        console.error("Prescription labs:", e);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, pincode, testsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = tests.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85vh] min-h-[400px] flex-col rounded-t-3xl p-0">
        <SheetHeader className="border-b border-border/40 px-5 pb-4 pt-6 text-left">
          <SheetTitle className="text-lg">Choose the lab</SheetTitle>
          <SheetDescription>
            {pincode ? `Labs that collect at ${pincode} and do your` : "Labs that do your"} {count === 1 ? "prescribed test" : `${count} prescribed tests`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <LoadingSpinner size="md" />
              <p className="mt-4 text-sm text-muted-foreground">Finding labs...</p>
            </div>
          ) : failed ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Couldn't load labs</h3>
              <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
            </div>
          ) : options.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">No labs yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">None of the labs near you do these tests right now.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {options.map((option) => {
                const { lab, matches, missing, total, noCommonDay } = option;
                const all = missing.length === 0;
                return (
                  <div key={lab.id} className="rounded-2xl border border-border/60 bg-card p-3.5">
                    <div className="flex items-start gap-3">
                      <LabAvatar name={lab.name} logoUrl={lab.logo_url} className="h-11 w-11 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-extrabold text-foreground">{lab.name}</p>
                          <span className="shrink-0 text-base font-black text-foreground">{formatRupees(total)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <LabRating rating={lab.rating ?? null} reviews={lab.reviews_count ?? 0} />
                          <span className={`shrink-0 text-[11px] font-bold ${all ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {all ? (count === 1 ? "Has your test" : `All ${count} tests`) : `${matches.length} of ${count} tests`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1 border-t border-border/50 pt-2.5">
                      {matches.map((m) => (
                        <li key={`${m.test.id ?? m.test.name}`} className="flex items-start justify-between gap-3 text-xs">
                          <span className="flex min-w-0 items-start gap-1.5 text-foreground">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="line-clamp-2">{m.name}</span>
                          </span>
                          <span className="shrink-0 font-semibold text-foreground">{formatRupees(m.price)}</span>
                        </li>
                      ))}
                      {missing.map((t) => (
                        <li key={`missing-${t.id ?? t.name}`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-2">{simplifyTestName(testTitle(t))} · not at this lab</span>
                        </li>
                      ))}
                    </ul>

                    {noCommonDay && (
                      <p className="mt-2 text-[11px] font-semibold text-destructive">
                        These tests are collected on different days here, so they can't be booked together.
                      </p>
                    )}

                    <Button
                      onClick={() => onChoose(option)}
                      disabled={noCommonDay}
                      className="mt-3 h-10 w-full rounded-full text-[13px] font-semibold"
                    >
                      {all ? "Book from this lab" : `Book ${matches.length} ${matches.length === 1 ? "test" : "tests"} from this lab`}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
