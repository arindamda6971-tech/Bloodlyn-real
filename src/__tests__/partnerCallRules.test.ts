import { describe, it, expect } from "vitest";
import { MISSES_BEFORE_LAB_ALERT, partnerCallProblem, shouldAlertLab } from "../../supabase/functions/_shared/collection-call";

const now = new Date("2026-11-19T10:00:00Z");
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString();
const call = (direction: string, status: string, secondsAgo: number) => ({ direction, status, created_at: ago(secondsAgo) });

describe("the patient calling the collection partner", () => {
  it("can call when nothing is going on", () => {
    expect(partnerCallProblem([], now)).toBeNull();
  });

  it("waits while any call on the order is live, either way", () => {
    expect(partnerCallProblem([call("to_patient", "ringing", 10)], now)).toMatch(/already going on/);
    expect(partnerCallProblem([call("to_partner", "ringing", 10)], now)).toMatch(/already going on/);
  });

  it("waits a minute after a call he didn't take, but not after a call they had", () => {
    expect(partnerCallProblem([call("to_partner", "missed", 50)], now)).toMatch(/wait a minute/);
    expect(partnerCallProblem([call("to_partner", "declined", 30)], now)).toMatch(/wait a minute/);
    expect(partnerCallProblem([call("to_partner", "missed", 70)], now)).toBeNull();
    expect(partnerCallProblem([call("to_partner", "ended", 20)], now)).toBeNull();
    // A rung-out ring still marked ringing counts as a miss, not a live call.
    expect(partnerCallProblem([call("to_partner", "ringing", 50)], now)).toMatch(/wait a minute/);
  });

  it("stops at five calls an hour; the partner's own calls don't count", () => {
    const five = [1, 2, 3, 4, 5].map((i) => call("to_partner", "missed", 300 * i));
    expect(partnerCallProblem(five, now)).toMatch(/several times/);
    expect(partnerCallProblem(five.slice(0, 4).concat(call("to_patient", "missed", 200)), now)).toBeNull();
  });

  it("tells the lab once, on the second miss in the hour", () => {
    expect(MISSES_BEFORE_LAB_ALERT).toBe(2);
    expect([1, 2, 3, 4].map(shouldAlertLab)).toEqual([false, true, false, false]);
  });
});
