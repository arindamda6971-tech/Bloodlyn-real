import { describe, expect, it } from "vitest";
import {
  formatAvailableDays,
  getCommonSpecializedDays,
  normalizeAvailabilityType,
  normalizeAvailableDays,
} from "./test-availability";

describe("test availability", () => {
  it("treats legacy tests as general", () => {
    expect(normalizeAvailabilityType(null)).toBe("GENERAL");
    expect(normalizeAvailabilityType("general")).toBe("GENERAL");
  });

  it("accepts Partner specialized tag variants", () => {
    expect(normalizeAvailabilityType("SPECIALIZED")).toBe("SPECIALIZED");
    expect(normalizeAvailabilityType("specialized_test")).toBe("SPECIALIZED");
    expect(normalizeAvailabilityType("Specialized Test")).toBe("SPECIALIZED");
    expect(normalizeAvailabilityType("specialised-test")).toBe("SPECIALIZED");
  });

  it("normalizes configured weekdays", () => {
    expect(normalizeAvailableDays(["Monday", "wed", "FRIDAY", "Monday", "invalid"])).toEqual([1, 3, 5]);
    expect(formatAvailableDays(["thu", "Monday"])).toBe("Monday, Thursday");
  });

  it("intersects specialized test days", () => {
    expect(getCommonSpecializedDays([
      { availabilityType: "SPECIALIZED", availableDays: ["Monday", "Wednesday"] },
      { availabilityType: "SPECIALIZED", availableDays: ["Wednesday", "Friday"] },
    ])).toEqual([3]);
  });

  it("returns an empty intersection for incompatible specialized tests", () => {
    expect(getCommonSpecializedDays([
      { availabilityType: "SPECIALIZED", availableDays: ["Monday"] },
      { availabilityType: "SPECIALIZED", availableDays: ["Friday"] },
    ])).toEqual([]);
  });
});