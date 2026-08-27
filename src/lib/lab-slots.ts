export type SlotBucket = "Morning" | "Afternoon" | "Evening" | "Overnight";

export const LAB_SLOT_TIME_ZONE = "Asia/Kolkata";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface SlotItem {
  id: string;
  time: string;
  label: SlotBucket;
  startHour: number;
  startMinutes: number;
}

export interface LabSlotDate {
  day: string;
  date: number;
  month: string;
  fullDate: string;
  dayOfWeek: number;
  available: boolean;
}

export function parseSlotStartMinutes(raw: string): number | null {
  const match = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const ampm = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minutes < 0 || minutes > 59) return null;
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return hour * 60 + minutes;
}

export function bucketForSlotStart(startMinutes: number): SlotBucket {
  const hour = Math.floor(startMinutes / 60);

  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 24) return "Evening";
  return "Overnight";
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getCurrentLabSlotMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LAB_SLOT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  return Number(getPart(parts, "hour")) * 60 + Number(getPart(parts, "minute"));
}

export function isSameDaySlotBookable(startMinutes: number, now: Date = new Date()): boolean {
  return startMinutes > getCurrentLabSlotMinutes(now);
}

export function getLabSlotDates(count = 7, now: Date = new Date()): LabSlotDate[] {
  return Array.from({ length: count }, (_, i) => {
    const target = new Date(now.getTime() + i * DAY_MS);
    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: LAB_SLOT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(target);
    const labelParts = new Intl.DateTimeFormat("en-US", {
      timeZone: LAB_SLOT_TIME_ZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).formatToParts(target);
    const weekday = getPart(labelParts, "weekday");
    const month = getPart(labelParts, "month");
    const day = Number(getPart(dateParts, "day"));
    const numericMonth = getPart(dateParts, "month");
    const year = getPart(dateParts, "year");

    return {
      day: weekday,
      date: day,
      month,
      fullDate: `${year}-${numericMonth}-${String(day).padStart(2, "0")}`,
      dayOfWeek: WEEKDAY_TO_INDEX[weekday] ?? 0,
      available: true,
    };
  });
}

export function toSortedSlotItems(raw: string[] | null | undefined): SlotItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((time) => {
      const startMinutes = parseSlotStartMinutes(time);
      if (startMinutes === null) return null;

      return {
        id: time,
        time,
        startHour: Math.floor(startMinutes / 60),
        startMinutes,
        label: bucketForSlotStart(startMinutes),
      } satisfies SlotItem;
    })
    .filter((slot): slot is SlotItem => slot !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.time.localeCompare(b.time));
}
/* ------------------------------------------------------------------
 * Fixed collection slots (blood test, ECG, BP — one shared system)
 * ------------------------------------------------------------------ */

export interface FixedCollectionSlot {
  id: string;
  label: Exclude<SlotBucket, "Overnight">;
  /** Human readable range, e.g. "6 AM - 10 AM" */
  time: string;
  /** Short note shown under the slot name */
  note: string;
  startMinutes: number;
  endMinutes: number;
  /** Value persisted on the order, e.g. "Morning (6 AM - 10 AM)" */
  display: string;
}

export const FIXED_COLLECTION_SLOTS: FixedCollectionSlot[] = [
  {
    id: "morning",
    label: "Morning",
    time: "6 AM - 10 AM",
    note: "Fast service",
    startMinutes: 6 * 60,
    endMinutes: 10 * 60,
    display: "Morning (6 AM - 10 AM)",
  },
  {
    id: "afternoon",
    label: "Afternoon",
    time: "10 AM - 2 PM",
    note: "Might be heavy traffic on the road",
    startMinutes: 10 * 60,
    endMinutes: 14 * 60,
    display: "Afternoon (10 AM - 2 PM)",
  },
  {
    id: "evening",
    label: "Evening",
    time: "2 PM - 6 PM",
    note: "It's a little slow",
    startMinutes: 14 * 60,
    endMinutes: 18 * 60,
    display: "Evening (2 PM - 6 PM)",
  },
];

/** Collection partner needs at least this much lead time before a slot ends. */
export const SLOT_MIN_LEAD_MINUTES = 60;

/**
 * A slot is bookable only if it ends more than 1 hour from now.
 * Future days (offset > 0) are always bookable.
 */
export function isFixedSlotBookable(
  slot: Pick<FixedCollectionSlot, "endMinutes">,
  dayOffset: number,
  now: Date = new Date()
): boolean {
  if (dayOffset > 0) return true;
  return slot.endMinutes - getCurrentLabSlotMinutes(now) > SLOT_MIN_LEAD_MINUTES;
}

/** Resolve a stored slot string back to a fixed slot (label match). */
export function findFixedSlot(value: string | null | undefined): FixedCollectionSlot | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  return FIXED_COLLECTION_SLOTS.find((s) => v.includes(s.label.toLowerCase()) || s.id === v);
}

/* ------------------------------------------------------------------
 * Shared lab-schedule mapping (blood test schedule === BP / ECG schedule)
 * ------------------------------------------------------------------ */

/**
 * Resolves whether a lab is open on a given day offset (0 = today, 1 = tomorrow, …)
 * using the exact same Partner-dashboard schedule source the blood-test flow uses.
 *
 * - `byDay` undefined / still loading  → treated as open (never blocks the UI)
 * - lab has no published schedule rows → closed (mirrors the blood-test flow)
 */
export function isLabOpenOnDayOffset(
  byDay: Record<number, { is_open: boolean }> | undefined,
  hasSchedule: boolean,
  dayOffset: number,
  now: Date = new Date()
): boolean {
  if (!byDay) return true;
  if (!hasSchedule) return false;
  const dates = getLabSlotDates(dayOffset + 1, now);
  const target = dates[dayOffset];
  if (!target) return false;
  return !!byDay[target.dayOfWeek]?.is_open;
}

/* ------------------------------------------------------------------
 * Collection window helpers (used by the tracking "was your blood
 * collected?" prompt — the "No" answer only unlocks after the slot ends)
 * ------------------------------------------------------------------ */

/** IST calendar date (yyyy-mm-dd) for a given instant. */
export function getLabSlotDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAB_SLOT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * True when the booked collection window has fully elapsed.
 * Orders without a schedule (ASAP) are treated as elapsed.
 */
export function hasCollectionWindowEnded(
  scheduledDate: string | null | undefined,
  scheduledTimeSlot: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!scheduledDate) return true;
  const today = getLabSlotDateKey(now);
  const day = scheduledDate.slice(0, 10);
  if (day < today) return true;
  if (day > today) return false;
  const slot = findFixedSlot(scheduledTimeSlot);
  if (!slot) return true;
  return getCurrentLabSlotMinutes(now) >= slot.endMinutes;
}
