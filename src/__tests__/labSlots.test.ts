import { describe, expect, it } from "vitest";
import {
  bucketForSlotStart,
  findFixedSlot,
  FIXED_COLLECTION_SLOTS,
  getLabSlotDates,
  hasCollectionWindowEnded,
  isFixedSlotBookable,
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

  it("exposes six consecutive two-hour collection windows", () => {
    expect(FIXED_COLLECTION_SLOTS.map((slot) => [slot.startMinutes, slot.endMinutes])).toEqual([
      [360, 480],
      [480, 600],
      [600, 720],
      [720, 840],
      [840, 960],
      [960, 1080],
    ]);
  });

  it("applies the one-hour lead rule to each two-hour window", () => {
    const nowAtNineAmIst = new Date("2026-06-01T03:30:00.000Z");

    expect(isFixedSlotBookable(FIXED_COLLECTION_SLOTS[0], 0, nowAtNineAmIst)).toBe(false);
    expect(isFixedSlotBookable(FIXED_COLLECTION_SLOTS[1], 0, nowAtNineAmIst)).toBe(false);
    expect(isFixedSlotBookable(FIXED_COLLECTION_SLOTS[2], 0, nowAtNineAmIst)).toBe(true);
    expect(isFixedSlotBookable(FIXED_COLLECTION_SLOTS[0], 1, nowAtNineAmIst)).toBe(true);
  });

  it("resolves exact two-hour slots before their repeated day-part labels", () => {
    expect(findFixedSlot("Morning (10 AM - 12 PM)")?.endMinutes).toBe(720);
    expect(findFixedSlot("Afternoon (2 PM - 4 PM)")?.endMinutes).toBe(960);
  });

  it("keeps legacy three-window orders compatible", () => {
    expect(findFixedSlot("Morning (6 AM - 10 AM)")?.endMinutes).toBe(600);
    expect(findFixedSlot("Afternoon (10 AM - 2 PM)")?.endMinutes).toBe(840);
    expect(findFixedSlot("Evening (2 PM - 6 PM)")?.endMinutes).toBe(1080);

    const elevenAmIst = new Date("2026-06-01T05:30:00.000Z");
    expect(hasCollectionWindowEnded("2026-06-01", "Morning (10 AM - 12 PM)", elevenAmIst)).toBe(false);
    expect(hasCollectionWindowEnded("2026-06-01", "Morning (6 AM - 10 AM)", elevenAmIst)).toBe(true);
  });
});