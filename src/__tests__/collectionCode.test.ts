import { describe, it, expect } from "vitest";
import { LOCK_MINUTES, MAX_WRONG_TRIES, checkCode, isCodeShape, slotHasEnded } from "../../supabase/functions/_shared/collection-code";

const now = new Date("2026-11-20T05:00:00Z"); // 10:30 AM India time
const fresh = { code: "4821", used_at: null, failed_attempts: 0, locked_until: null };

describe("the collection code", () => {
  it("takes only 4 digits", () => {
    expect(isCodeShape("4821")).toBe(true);
    expect(["482", "48210", "48a1", "", null].map(isCodeShape)).toEqual([false, false, false, false, false]);
  });

  it("accepts the patient's code", () => {
    expect(checkCode(fresh, "4821", now)).toEqual({ ok: true });
  });

  it("counts wrong codes and locks after five", () => {
    const first = checkCode(fresh, "1111", now);
    expect(first).toMatchObject({ ok: false, status: 400, save: { failed_attempts: 1, locked_until: null } });
    expect(first.ok === false && first.error).toMatch(/4 tries left/);
    const fifth = checkCode({ ...fresh, failed_attempts: MAX_WRONG_TRIES - 1 }, "1111", now);
    expect(fifth).toMatchObject({ ok: false, status: 429, save: { failed_attempts: 0 } });
    const lockedUntil = fifth.ok === false ? fifth.save?.locked_until : null;
    expect(Date.parse(String(lockedUntil)) - now.getTime()).toBe(LOCK_MINUTES * 60_000);
    // While locked even the right code waits.
    expect(checkCode({ ...fresh, locked_until: String(lockedUntil) }, "4821", now)).toMatchObject({ ok: false, status: 429 });
    // After the lock, tries start again.
    expect(checkCode({ ...fresh, failed_attempts: 0, locked_until: "2026-11-20T04:00:00Z" }, "4821", now)).toEqual({ ok: true });
  });

  it("can't be used twice", () => {
    expect(checkCode({ ...fresh, used_at: "2026-11-20T04:30:00Z" }, "4821", now)).toMatchObject({ ok: false, status: 409 });
  });
});

describe("late (after the booked slot)", () => {
  it("is late once the slot has ended, India time", () => {
    expect(slotHasEnded("2026-11-20", "08:00 AM - 10:00 AM", now)).toBe(true);
    expect(slotHasEnded("2026-11-20", "10:00 AM - 12:00 PM", now)).toBe(false);
    expect(slotHasEnded("2026-11-19", "06:00 PM - 08:00 PM", now)).toBe(true);
    expect(slotHasEnded("2026-11-21", "08:00 AM - 10:00 AM", now)).toBe(false);
    expect(slotHasEnded("2026-11-20T00:00:00", "Morning (8 AM - 10 AM)", now)).toBe(true);
    // No day booked: never late.
    expect(slotHasEnded(null, null, now)).toBe(false);
  });
});
