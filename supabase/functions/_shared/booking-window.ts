// Shared by reschedule-order and the app: where a booking may be moved to.
//
// The rule: a booking moves only to the next day after its booked date (from
// today if that date has passed). A day the lab is closed, or has no free time
// left, is skipped for the day after it.

/** How far ahead the next open day is looked for, matching lab-slots' 8 days. */
export const RESCHEDULE_DAYS_AHEAD = 7;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's date in India as YYYY-MM-DD. */
export const istToday = (now: Date = new Date()) => new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Why a collection time can't be used, or null when it can. `normalizedSlot`
 * is the slot's "HH:MM-HH:MM" form; a slot that has already started is too late.
 */
export function rescheduleTargetProblem(date: string, normalizedSlot: string, now: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(normalizedSlot)) {
    return "Invalid collection time";
  }
  const start = Date.parse(`${date}T${normalizedSlot.slice(0, 5)}:00+05:30`);
  if (Number.isNaN(start)) return "Invalid collection time";
  if (start <= now.getTime()) return "That collection time has already started. Please pick a later slot.";
  if (date > addDays(istToday(now), RESCHEDULE_DAYS_AHEAD)) return `Please pick a date within the next ${RESCHEDULE_DAYS_AHEAD} days.`;
  return null;
}

/** One of the lab's collection times on a day, with how many places are left. */
export interface SlotPlaces {
  normalized: string;
  remaining: number;
}

/** date (YYYY-MM-DD) → the lab's times that day. Missing or empty means closed. */
export type LabDays = Record<string, SlotPlaces[]>;

/** The first day to look at: the day after the booking, or today if that has passed. */
export function rescheduleSearchStart(bookedDate: string | null | undefined, now: Date = new Date()): string {
  const today = istToday(now);
  const dayAfter = bookedDate && /^\d{4}-\d{2}-\d{2}/.test(bookedDate) ? addDays(bookedDate.slice(0, 10), 1) : today;
  return dayAfter > today ? dayAfter : today;
}

/** The one day a booking can move to, or null when the lab has no free time soon. */
export function nextRescheduleDate(bookedDate: string | null | undefined, labDays: LabDays, now: Date = new Date()): string | null {
  const last = addDays(istToday(now), RESCHEDULE_DAYS_AHEAD);
  for (let date = rescheduleSearchStart(bookedDate, now); date <= last; date = addDays(date, 1)) {
    const free = (labDays[date] ?? []).some((slot) => slot.remaining > 0 && rescheduleTargetProblem(date, slot.normalized, now) === null);
    if (free) return date;
  }
  return null;
}
