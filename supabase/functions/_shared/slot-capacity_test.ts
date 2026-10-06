import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeCollectionSlot, parseSlotCapacities } from "./slot-capacity.ts";

Deno.test("normalizes Partner Pro padded two-hour ranges", () => {
  assertEquals(normalizeCollectionSlot("06:00 AM - 08:00 AM")?.id, "morning-6-8");
  assertEquals(normalizeCollectionSlot("10:00 AM - 12:00 PM")?.id, "morning-10-12");
  assertEquals(normalizeCollectionSlot("Afternoon (2 PM - 4 PM)")?.id, "afternoon-2-4");
});

Deno.test("preserves zero capacity as a closed slot", () => {
  const capacities = parseSlotCapacities({
    "06:00 AM - 08:00 AM": 0,
    "08:00 AM - 10:00 AM": 5,
  });
  assertEquals(capacities["morning-6-8"], 0);
  assertEquals(capacities["morning-8-10"], 5);
  assertEquals(capacities["evening-4-6"], null);
});
