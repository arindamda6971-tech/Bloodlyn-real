import { describe, it, expect } from "vitest";
import { bookingDays, bookingWhen } from "@/lib/doctor-booking";

describe("doctor booking days", () => {
  it("offers today, tomorrow and the day after, in India time", () => {
    // 2026-11-11 20:00 UTC is 1:30 AM on Nov 12 in India.
    const days = bookingDays(new Date("2026-11-11T20:00:00Z"));
    expect(days).toHaveLength(3);
    expect(days[0]).toEqual({ date: "2026-11-12", top: "Today", day: "12", month: "Nov" });
    expect(days[1].top).toBe("Tomorrow");
    expect(days[2]).toMatchObject({ date: "2026-11-14", top: "Sat" });
  });

  it("books today as soon as possible, later days for any time that day", () => {
    expect(bookingWhen(true)).toBe("As soon as possible");
    expect(bookingWhen(false)).toBe("Any time that day");
  });
});
