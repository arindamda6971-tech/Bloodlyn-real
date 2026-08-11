import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLabSlots } from "@/hooks/useLabSlots";
import { getLabSlotDates } from "@/lib/lab-slots";

/**
 * Per-day (today / tomorrow / day after) open-closed status for a lab, read from
 * the exact same Partner-dashboard schedule the blood-test booking flow uses.
 *
 * Resolves the lab's `vendor_id` (= Partner `lab_user_id`) from
 * `diagnostic_centers` when the caller only has a lab id.
 *
 * While the schedule is loading, every day is reported open so the UI never
 * flickers "Closed".
 */
export function useLabOpenDays(
  labId: string | null | undefined,
  vendorIdFromLab: string | null | undefined,
  dayCount = 3
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

  const dates = getLabSlotDates(dayCount);
  const scheduleKnown = !!resolvedVendorId && !isLoading;

  const openByOffset = dates.map((d) => {
    if (!scheduleKnown) return true;
    return !!labSlots?.byDay?.[d.dayOfWeek]?.is_open;
  });

  return {
    dates,
    openByOffset,
    vendorId: resolvedVendorId,
    isLoading: !!resolvedVendorId && isLoading,
    scheduleKnown,
  };
}
