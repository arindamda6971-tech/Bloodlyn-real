import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LabDaySchedule {
  is_open: boolean;
  slots: string[];
}

export type LabSlotsByDay = Record<number, LabDaySchedule>;

export interface LabSlotsResult {
  byDay: LabSlotsByDay;
  /** true when the Partner dashboard has a real schedule for this lab */
  hasSchedule: boolean;
}

/**
 * Reads the lab's real schedule (day_of_week / is_open / slots) straight from the
 * Partner project via the `lab-slots` edge function. No fabricated fallback slots:
 * if the Partner dashboard has no schedule for a day, that day is closed.
 */
export function useLabSlots(labUserId: string | null | undefined) {
  return useQuery<LabSlotsResult>({
    queryKey: ["lab-slots", labUserId],
    enabled: !!labUserId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lab-slots", {
        body: { lab_user_id: labUserId },
      });
      if (error) throw error;

      const rows: Array<{ day_of_week: number; is_open: boolean; slots: string[] | null }> =
        Array.isArray(data?.rows) ? data.rows : [];

      const byDay: LabSlotsByDay = {};
      rows.forEach((r) => {
        if (typeof r?.day_of_week !== "number") return;
        byDay[r.day_of_week] = {
          is_open: !!r.is_open,
          slots: Array.isArray(r.slots) ? r.slots.filter((s) => typeof s === "string") : [],
        };
      });

      return { byDay, hasSchedule: rows.length > 0 };
    },
  });
}
