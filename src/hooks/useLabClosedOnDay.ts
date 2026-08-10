import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLabSlots } from "@/hooks/useLabSlots";
import { getLabSlotDates } from "@/lib/lab-slots";

/**
 * Single source of truth for "is this lab open on day N?" shared by the
 * blood-test, ECG and BP booking flows.
 *
 * It resolves the lab's `vendor_id` (= Partner project `lab_user_id`) from
 * `diagnostic_centers` when the caller only has a lab id (e.g. a lab
 * preselected from the lab profile screen), then reads the Partner dashboard
 * schedule via the existing `lab-slots` edge function.
 *
 * Semantics intentionally match the blood-test flow:
 *  - schedule still loading            → treated as open (never flickers closed)
 *  - no schedule row for that weekday  → closed
 */
export function useLabClosedOnDay(
  labId: string | null | undefined,
  vendorIdFromLab: string | null | undefined,
  dayOffset: number
) {
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(
    vendorIdFromLab ?? null
  );

  useEffect(() => {
    if (vendorIdFromLab) {
      setResolvedVendorId(vendorIdFromLab);
      return;
    }
    setResolvedVendorId(null);
    if (!labId || !/^[0-9a-f-]{36}$/i.test(labId)) return;

    let cancelled = false;
    supabase
      .from("diagnostic_centers")
      .select("vendor_id")
      .eq("id", labId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setResolvedVendorId((data?.vendor_id as string) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [labId, vendorIdFromLab]);

  const { data: labSlots, isLoading } = useLabSlots(resolvedVendorId);

  const dates = getLabSlotDates(dayOffset + 1);
  const target = dates[dayOffset];
  const dayRow = target ? labSlots?.byDay?.[target.dayOfWeek] : undefined;

  const isClosed = !!resolvedVendorId && !isLoading && (!dayRow || !dayRow.is_open);

  return { isClosed, vendorId: resolvedVendorId, isLoading };
}
