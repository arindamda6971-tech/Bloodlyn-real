import { describe, expect, it } from "vitest";
import {
  bucketForSlotStart,
  getLabSlotDates,
  isSameDaySlotBookable,
  parseSlotStartMinutes,
  toSortedSlotItems,
} from "@/lib/lab-slots";

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

  it("builds today's date/day in the lab timezone", () => {
    const dates = getLabSlotDates(1, new Date("2026-06-01T19:00:00.000Z"));

    expect(dates[0].fullDate).toBe("2026-06-02");
    expect(dates[0].day).toBe("Tue");
    expect(dates[0].dayOfWeek).toBe(2);
  });

  it("filters only same-day slots that have already started in the lab timezone", () => {
    const nowAtNinePmIst = new Date("2026-06-01T15:30:00.000Z");
    const eightPm = parseSlotStartMinutes("8:00 PM - 10:00 PM")!;
    const tenPm = parseSlotStartMinutes("10:00 PM - 12:00 AM")!;

    expect(isSameDaySlotBookable(eightPm, nowAtNinePmIst)).toBe(false);
    expect(isSameDaySlotBookable(tenPm, nowAtNinePmIst)).toBe(true);
  });
});