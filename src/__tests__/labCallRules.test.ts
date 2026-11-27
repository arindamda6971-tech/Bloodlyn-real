import { describe, it, expect } from "vitest";
import {
  LAB_CALLS_PER_HOUR,
  labCallOrderProblem,
  labCallStartProblem,
} from "../../supabase/functions/_shared/collection-call";
import { collectionCallAlert, labCallAlert, labMissedAlert } from "../../supabase/functions/_shared/push-alerts";

const now = new Date("2026-11-27T10:00:00Z");
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString();
const DAY = 86_400;

describe("when a lab may call its patient", () => {
  it("only after the lab has accepted the booking", () => {
    expect(labCallOrderProblem({ status: "pending" }, now)).toMatch(/Accept the booking first/);
    expect(labCallOrderProblem({ status: "confirmed" }, now)).toMatch(/Accept the booking first/);
    for (const status of ["accepted", "partner_assigned", "collection_pending", "sample_collected", "processing"]) {
      expect(labCallOrderProblem({ status }, now)).toBeNull();
    }
  });

  it("never about a cancelled or no-show booking", () => {
    expect(labCallOrderProblem({ status: "cancelled" }, now)).toMatch(/closed/);
    expect(labCallOrderProblem({ status: "accepted", is_escalated: true }, now)).toMatch(/closed/);
  });

  it("up to three days after the report, for a question about it", () => {
    expect(labCallOrderProblem({ status: "report_ready", updated_at: ago(2 * DAY) }, now)).toBeNull();
    expect(labCallOrderProblem({ status: "completed", updated_at: ago(4 * DAY) }, now)).toMatch(/more than 3 days ago/);
  });
});

describe("starting a lab call", () => {
  const call = (caller_role: string, status: string, secondsAgo: number, direction = "to_patient") => ({
    caller_role,
    direction,
    status,
    created_at: ago(secondsAgo),
  });

  it("can start when nothing is going on", () => {
    expect(labCallStartProblem([], now)).toBeNull();
  });

  it("waits while any call on the booking is live, from anyone", () => {
    expect(labCallStartProblem([call("partner", "ringing", 10)], now)).toMatch(/already going on/);
    expect(labCallStartProblem([call("partner", "ringing", 10, "to_partner")], now)).toMatch(/already going on/);
  });

  it(`stops at ${LAB_CALLS_PER_HOUR} lab calls an hour; the partner's calls don't count`, () => {
    const five = [1, 2, 3, 4, 5].map((i) => call("lab", "missed", 300 * i));
    expect(labCallStartProblem(five, now)).toMatch(/5 times in the last hour/);
    expect(labCallStartProblem(five.slice(0, 4).concat(call("partner", "missed", 200)), now)).toBeNull();
    // Older than an hour no longer counts.
    expect(labCallStartProblem(five.slice(0, 4).concat(call("lab", "missed", 3700)), now)).toBeNull();
  });
});

describe("the lab call's alerts", () => {
  it("open the same call screen as a partner's call, and the lock screen says only 'your lab'", () => {
    const ring = labCallAlert("o1");
    expect(ring.kind).toBe(collectionCallAlert("o1").kind);
    expect(ring.channel).toBe("calls");
    expect(ring.title).toBe("Your lab is calling");
    expect(labMissedAlert("o1").title).toBe("Missed call from your lab");
  });
});
