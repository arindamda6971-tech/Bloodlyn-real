import type { LabSlotsByDay } from "@/hooks/useLabSlots";
import { FIXED_COLLECTION_SLOTS, parseSlotStartMinutes, type FixedCollectionSlot } from "@/lib/lab-slots";

/**
 * Start and end of a slot name, in minutes, wherever the times are in it:
 * "06:00 AM - 08:00 AM" and "Morning (6 AM - 8 AM)" both read as 360–480.
 */
function slotRange(slot: string): { start: number; end: number } | null {
  const times = slot.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM)/gi) ?? [];
  const first = times[0];
  const last = times[times.length - 1];
  if (times.length < 2 || !first || !last) return null;
  const start = parseSlotStartMinutes(first);
  const end = parseSlotStartMinutes(last);
  return start === null || end === null ? null : { start, end };
}

/**
 * The collection slots booking offers on this day: on an open day, booking always
 * shows the six fixed 2-hour slots from 6 AM to 6 PM, and only a capacity of 0 in
 * the Partner portal takes one away. The lab's own slot names aren't used by
 * booking, so they mustn't decide what the lab page shows either.
 */
export function offeredCollectionSlots(day: LabSlotsByDay[number] | undefined): FixedCollectionSlot[] {
  if (!day?.is_open) return [];
  const switchedOff = new Set<string>();
  for (const [name, capacity] of Object.entries(day.slotCapacities ?? {})) {
    if (capacity !== 0) continue;
    const range = slotRange(name);
    const fixed = range && FIXED_COLLECTION_SLOTS.find((slot) => slot.startMinutes === range.start && slot.endMinutes === range.end);
    if (fixed) switchedOff.add(fixed.id);
  }
  return FIXED_COLLECTION_SLOTS.filter((slot) => !switchedOff.has(slot.id));
}

/**
 * "Belda Belda" with city "Belda" → "Belda": labs often type the town into both
 * fields, or twice in one, and the header would repeat it.
 */
export function tidyLabAddress(street?: string | null, city?: string | null): string {
  const seen = new Set<string>();
  return [street, city]
    .flatMap((value) => (value ?? "").split(","))
    .map((part) => part.trim().split(/\s+/).filter((word, i, words) => i === 0 || word.toLowerCase() !== words[i - 1].toLowerCase()).join(" "))
    .filter((part) => {
      const key = part.toLowerCase();
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}
