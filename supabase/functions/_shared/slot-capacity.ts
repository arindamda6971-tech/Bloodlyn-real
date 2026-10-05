export const COLLECTION_SLOTS = [
  { id: "morning-6-8", display: "Morning (6 AM - 8 AM)", normalized: "06:00-08:00" },
  { id: "morning-8-10", display: "Morning (8 AM - 10 AM)", normalized: "08:00-10:00" },
  { id: "morning-10-12", display: "Morning (10 AM - 12 PM)", normalized: "10:00-12:00" },
  { id: "afternoon-12-2", display: "Afternoon (12 PM - 2 PM)", normalized: "12:00-14:00" },
  { id: "afternoon-2-4", display: "Afternoon (2 PM - 4 PM)", normalized: "14:00-16:00" },
  { id: "evening-4-6", display: "Evening (4 PM - 6 PM)", normalized: "16:00-18:00" },
] as const;

export type CollectionSlotId = typeof COLLECTION_SLOTS[number]["id"];

const compact = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
const timeToken = (value: string) => value
  .replace(/\b0(\d):/g, "$1:")
  .replace(/:00\s*/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export function normalizeCollectionSlot(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = timeToken(compact(value));
  return COLLECTION_SLOTS.find((slot) => {
    if (normalized === slot.id || normalized === slot.normalized) return true;
    const range = timeToken(compact(slot.display.slice(slot.display.indexOf("(") + 1, -1)));
    return normalized.includes(range);
  }) ?? null;
}

export function parseSlotCapacities(value: unknown): Record<CollectionSlotId, number | null> {
  const result = Object.fromEntries(COLLECTION_SLOTS.map((slot) => [slot.id, null])) as Record<CollectionSlotId, number | null>;
  const assign = (key: unknown, rawCapacity: unknown) => {
    const slot = normalizeCollectionSlot(key);
    const capacity = Number(rawCapacity);
    if (slot && Number.isInteger(capacity) && capacity >= 0) result[slot.id] = capacity;
  };

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const row = entry as Record<string, unknown>;
      assign(row.slot_id ?? row.id ?? row.slot ?? row.time ?? row.label, row.capacity ?? row.slot_capacity ?? row.value);
    });
  } else if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const row = raw as Record<string, unknown>;
        assign(row.slot_id ?? row.id ?? row.slot ?? row.time ?? key, row.capacity ?? row.slot_capacity ?? row.value);
      } else {
        assign(key, raw);
      }
    });
  }

  return result;
}
