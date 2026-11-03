import { describe, expect, it } from "vitest";
import { offeredCollectionSlots, tidyLabAddress } from "./lab-hours";

describe("tidyLabAddress", () => {
  it("doesn't repeat the town", () => {
    expect(tidyLabAddress("Belda Belda", "Belda")).toBe("Belda");
    expect(tidyLabAddress("12 Station Road, Belda", "belda")).toBe("12 Station Road, Belda");
    expect(tidyLabAddress("Salt Lake", "Kolkata")).toBe("Salt Lake, Kolkata");
    expect(tidyLabAddress("", null)).toBe("");
  });
});

const ALL_SLOTS = ["06:00 AM - 08:00 AM", "08:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM"];

describe("offeredCollectionSlots", () => {
  it("offers booking's six slots on an open day, whatever the lab's old slot names say", () => {
    const day = { is_open: true, slots: ["Evening (4 PM - 8 PM)"], slotCapacities: {} };
    expect(offeredCollectionSlots(day)).toHaveLength(6);
  });

  it("leaves out slots switched off with capacity 0, in either name style", () => {
    const day = { is_open: true, slots: [], slotCapacities: { "06:00 AM - 08:00 AM": 0, "Evening (4 PM - 6 PM)": 0, "08:00 AM - 10:00 AM": 5 } };
    expect(offeredCollectionSlots(day).map((s) => s.id)).toEqual(["morning-8-10", "morning-10-12", "afternoon-12-2", "afternoon-2-4"]);
  });

  it("has nothing on a closed day or one with every slot off", () => {
    expect(offeredCollectionSlots({ is_open: false, slots: [], slotCapacities: {} })).toEqual([]);
    expect(offeredCollectionSlots({ is_open: true, slots: [], slotCapacities: Object.fromEntries(ALL_SLOTS.map((s) => [s, 0])) })).toEqual([]);
    expect(offeredCollectionSlots(undefined)).toEqual([]);
  });
});
