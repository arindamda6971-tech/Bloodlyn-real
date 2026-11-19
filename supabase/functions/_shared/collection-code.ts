/**
 * The collection code: a 4-digit code made for a blood-collection booking the moment
 * the lab assigns a collection partner (database trigger make_collection_code). Only
 * the patient sees it, in the BloodLyn app. When the partner has collected the sample
 * he enters it (collection-call "confirm_collected"), and that marks the booking
 * collected, as the patient's "Yes" used to. A code used after the booked slot ends
 * is recorded as late.
 */

export const MAX_WRONG_TRIES = 5;
export const LOCK_MINUTES = 15;

export const isCodeShape = (v: unknown): v is string => typeof v === "string" && /^\d{4}$/.test(v);

/** Slot end in minutes from midnight, for current and legacy slots. */
export function slotEndMinutes(slot: string | null | undefined): number | null {
  if (!slot) return null;
  const s = slot.toLowerCase();
  const range = s.match(/-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (range) {
    let hour = Number(range[1]);
    const minute = Number(range[2] ?? "0");
    const meridiem = range[3].toLowerCase();
    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      if (meridiem === "pm" && hour !== 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
      return hour * 60 + minute;
    }
  }
  if (s.includes("morning")) return 10 * 60;
  if (s.includes("afternoon")) return 14 * 60;
  if (s.includes("evening")) return 18 * 60;
  return null;
}

/** Has the booked slot ended (India time)? A booking without a day or slot never counts as late. */
export function slotHasEnded(scheduledDate: string | null | undefined, slot: string | null | undefined, now = new Date()): boolean {
  const day = String(scheduledDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const ist = new Date(now.getTime() + 330 * 60_000);
  const today = ist.toISOString().slice(0, 10);
  if (day !== today) return day < today;
  const end = slotEndMinutes(slot);
  if (end === null) return false;
  return ist.getUTCHours() * 60 + ist.getUTCMinutes() >= end;
}

export interface CodeRow {
  code: string;
  used_at: string | null;
  failed_attempts: number | null;
  locked_until: string | null;
}

export type CodeCheck =
  | { ok: true }
  | { ok: false; status: number; error: string; save?: { failed_attempts: number; locked_until: string | null } };

/** Is this the patient's code? Wrong tries count; five lock it for a while. */
export function checkCode(row: CodeRow, input: string, now = new Date()): CodeCheck {
  if (row.used_at) return { ok: false, status: 409, error: "This collection is already confirmed." };
  if (row.locked_until && Date.parse(row.locked_until) > now.getTime()) {
    const mins = Math.max(1, Math.ceil((Date.parse(row.locked_until) - now.getTime()) / 60_000));
    return { ok: false, status: 429, error: `Too many wrong codes. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }
  if (input === row.code) return { ok: true };
  const wrong = (row.locked_until ? 0 : row.failed_attempts ?? 0) + 1;
  if (wrong >= MAX_WRONG_TRIES) {
    return {
      ok: false,
      status: 429,
      error: `Too many wrong codes. Try again in ${LOCK_MINUTES} minutes.`,
      save: { failed_attempts: 0, locked_until: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() },
    };
  }
  const left = MAX_WRONG_TRIES - wrong;
  return {
    ok: false,
    status: 400,
    error: `That's not the patient's code. ${left} ${left === 1 ? "try" : "tries"} left.`,
    save: { failed_attempts: wrong, locked_until: null },
  };
}
