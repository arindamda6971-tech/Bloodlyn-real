import { describe, it, expect } from "vitest";
import { formatPassDate, formatTimeWindow, relativeDayPhrase, testSampleLine } from "./booking-format";

describe("booking display format", () => {
  it("shortens a time window that shares AM/PM", () => {
    expect(formatTimeWindow("Afternoon (2 PM - 4 PM)")).toBe("2 – 4 PM");
  });

  it("keeps both markers when the window crosses noon", () => {
    expect(formatTimeWindow("Morning (10 AM - 12 PM)")).toBe("10 AM – 12 PM");
  });

  it("falls back to the bracketed text for unknown windows", () => {
    expect(formatTimeWindow("Evening (anytime)")).toBe("anytime");
    expect(formatTimeWindow(null)).toBeNull();
  });

  it("formats the booking day", () => {
    expect(formatPassDate("2026-11-07")).toBe("Sat, 7 Nov");
  });

  it("describes the sample and fasting only when known", () => {
    expect(testSampleLine({ sampleType: "blood" })).toBe("Blood");
    expect(testSampleLine({ sampleType: "Serum", fastingRequired: true })).toBe("Serum · Fasting required");
    expect(testSampleLine({ fastingRequired: true, fastingInstruction: "10–12 hours fasting" })).toBe("10–12 hours fasting");
    expect(testSampleLine({})).toBeNull();
  });

  it("says today, tomorrow, a weekday, or the date", () => {
    const now = new Date(2026, 10, 7, 9, 30);
    expect(relativeDayPhrase("2026-11-07", now)).toBe("today");
    expect(relativeDayPhrase("2026-11-08", now)).toBe("tomorrow");
    expect(relativeDayPhrase("2026-11-10", now)).toBe("on Tuesday");
    expect(relativeDayPhrase("2026-11-20", now)).toBe("on Fri, 20 Nov");
  });
});
