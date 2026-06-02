import { describe, expect, it } from "vitest";
import { bucketForSlotStart, parseSlotStartMinutes, toSortedSlotItems } from "@/lib/lab-slots";

describe("lab slot bucketing", () => {
  const bucketFor = (time: string) => {
    const start = parseSlotStartMinutes(time);
    expect(start).not.toBeNull();
    return bucketForSlotStart(start!);
  };

  it("keeps evening boundary slots out of Overnight", () => {
    expect(bucketFor("5:00 PM - 7:00 PM")).toBe("Evening");
    expect(bucketFor("9:59 PM - 10:30 PM")).toBe("Evening");
    expect(bucketFor("10:00 PM - 12:00 AM")).toBe("Evening");
  });

  it("starts Overnight only after midnight until before 5 AM", () => {
    expect(bucketFor("12:00 AM - 2:00 AM")).toBe("Overnight");
    expect(bucketFor("4:59 AM - 6:00 AM")).toBe("Overnight");
    expect(bucketFor("5:00 AM - 7:00 AM")).toBe("Morning");
  });

  it("sorts slots by parsed start time before display", () => {
    expect(
      toSortedSlotItems([
        "10:00 PM - 12:00 AM",
        "6:00 PM - 8:00 PM",
        "8:00 PM - 10:00 PM",
      ]).map((slot) => slot.time)
    ).toEqual([
      "6:00 PM - 8:00 PM",
      "8:00 PM - 10:00 PM",
      "10:00 PM - 12:00 AM",
    ]);
  });
});