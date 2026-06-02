export type SlotBucket = "Morning" | "Afternoon" | "Evening" | "Overnight";

export interface SlotItem {
  id: string;
  time: string;
  label: SlotBucket;
  startHour: number;
  startMinutes: number;
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