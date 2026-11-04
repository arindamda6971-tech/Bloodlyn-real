// Reads a lab's saved collection schedule (lab_time_slots) from the Partner project.
// The Partner project's publishable key is public by design; the
// PARTNER_SUPABASE_ANON_KEY setting is stale and points at the wrong project.
export const PARTNER_URL = "https://wkhwuzsiehrcvlxfeytf.supabase.co";
export const PARTNER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraHd1enNpZWhyY3ZseGZleXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzE2MTYsImV4cCI6MjEwMTk0NzYxNn0.fFrH7uJ_fCn0hkAlQdf3yLNW5x9LOTE2yAg8jhWyPxM";

export interface LabScheduleRow {
  day_of_week: number;
  is_open: boolean;
  slots?: string[] | null;
  slot_capacities?: Record<string, number> | null;
}

/** The lab's rows, one per weekday; null when the Partner project can't be reached. */
export async function fetchLabSchedule(labUserId: string, timeoutMs = 5000): Promise<LabScheduleRow[] | null> {
  const url = new URL(`${PARTNER_URL}/rest/v1/lab_time_slots`);
  url.searchParams.set("select", "day_of_week,is_open,slots,slot_capacities");
  url.searchParams.set("lab_user_id", `eq.${labUserId}`);
  url.searchParams.set("order", "day_of_week.asc");
  try {
    const res = await fetch(url, {
      headers: { apikey: PARTNER_ANON_KEY, Authorization: `Bearer ${PARTNER_ANON_KEY}`, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
