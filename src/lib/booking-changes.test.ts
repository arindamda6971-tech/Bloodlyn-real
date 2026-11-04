import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canPatientChangeBooking, cancelledByPatient, rescheduleSlotState } from "./booking-changes";
import {
  nextRescheduleDate, RESCHEDULE_DAYS_AHEAD, rescheduleTargetProblem, type LabDays,
} from "../../supabase/functions/_shared/booking-window";

describe("nextRescheduleDate", () => {
  // Wed 4 Nov 2026, 9:30 AM in India.
  const now = new Date("2026-11-04T04:00:00Z");
  const open = (remaining = 2) => [
    { normalized: "06:00-08:00", remaining },
    { normalized: "14:00-16:00", remaining },
  ];

  it("moves to the day after the booking", () => {
    const days: LabDays = { "2026-11-05": open(), "2026-11-06": open(), "2026-11-07": open() };
    expect(nextRescheduleDate("2026-11-05", days, now)).toBe("2026-11-06");
  });

  it("skips days the lab is closed, one after another", () => {
    const days: LabDays = { "2026-11-05": open(), "2026-11-08": open() }; // Fri 6 and Sat 7 closed
    expect(nextRescheduleDate("2026-11-05", days, now)).toBe("2026-11-08");
  });

  it("skips a day with no free time left", () => {
    const days: LabDays = { "2026-11-06": open(0), "2026-11-07": open() };
    expect(nextRescheduleDate("2026-11-05", days, now)).toBe("2026-11-07");
  });

  it("starts from today when the booked day has passed, using only times still to come", () => {
    const days: LabDays = { "2026-11-04": open(), "2026-11-05": open() };
    expect(nextRescheduleDate("2026-11-02", days, now)).toBe("2026-11-04"); // the 2 PM time today
    const morningOnly: LabDays = { "2026-11-04": [{ normalized: "06:00-08:00", remaining: 3 }], "2026-11-05": open() };
    expect(nextRescheduleDate("2026-11-02", morningOnly, now)).toBe("2026-11-05");
  });

  it("finds nothing when the lab has no free time soon", () => {
    expect(nextRescheduleDate("2026-11-05", {}, now)).toBeNull();
    expect(nextRescheduleDate("2026-11-05", { "2026-11-20": open() }, now)).toBeNull();
  });
});

describe("canPatientChangeBooking", () => {
  it("allows changes until the lab assigns a collection partner", () => {
    for (const status of ["pending", "confirmed", "accepted", "collection_pending", "Accepted"]) {
      expect(canPatientChangeBooking({ status })).toBe(true);
    }
  });

  it("stops once a collection partner is assigned, by status or by name", () => {
    expect(canPatientChangeBooking({ status: "partner_assigned" })).toBe(false);
    expect(canPatientChangeBooking({ status: "processing" })).toBe(false);
    expect(canPatientChangeBooking({ status: "accepted", delivery_partner_name: "Ravi" })).toBe(false);
    expect(canPatientChangeBooking({ status: "accepted", delivery_partner_phone: "9876543210" })).toBe(false);
    expect(canPatientChangeBooking({ status: "accepted", phlebotomist_id: "p1" })).toBe(false);
  });

  it("stops for collected, finished, cancelled and reported orders", () => {
    for (const status of ["sample_collected", "report_ready", "completed", "cancelled"]) {
      expect(canPatientChangeBooking({ status })).toBe(false);
    }
    expect(canPatientChangeBooking({ status: "pending", is_escalated: true })).toBe(false);
    expect(canPatientChangeBooking(null)).toBe(false);
  });

  it("matches the database rule", () => {
    const sql = readFileSync("supabase/migrations/20261104090000_customer_cancel_reschedule.sql", "utf8");
    expect(sql).toContain("IN ('pending', 'confirmed', 'accepted', 'collection_pending')");
    expect(sql).toContain("o.phlebotomist_id IS NULL");
  });
});

describe("rescheduleSlotState", () => {
  const open = { started: false, isCurrentBooking: false };

  it("offers only times the lab saved, with places left", () => {
    expect(rescheduleSlotState({ ...open, availability: { capacity: 3, remaining: 2 } })).toEqual({ disabled: false, note: "2 left" });
  });

  it("never offers a time the lab didn't set up", () => {
    expect(rescheduleSlotState({ ...open, availability: undefined })).toEqual({ disabled: true, note: "Not offered" });
    expect(rescheduleSlotState({ ...open, availability: { capacity: null, remaining: null } })).toEqual({ disabled: true, note: "Not offered" });
    expect(rescheduleSlotState({ ...open, availability: { capacity: 0, remaining: 0 } })).toEqual({ disabled: true, note: "Not offered" });
  });

  it("blocks full, started and current times", () => {
    expect(rescheduleSlotState({ ...open, availability: { capacity: 2, remaining: 0 } }).note).toBe("Full");
    expect(rescheduleSlotState({ started: true, isCurrentBooking: false, availability: { capacity: 3, remaining: 3 } }).note).toBe("Started");
    expect(rescheduleSlotState({ started: false, isCurrentBooking: true, availability: { capacity: 3, remaining: 3 } }).note).toBe("Your booking");
  });
});

describe("cancelledByPatient", () => {
  it("tells a patient's own cancel from the lab's", () => {
    expect(cancelledByPatient("Cancelled by patient: My plans changed")).toBe(true);
    expect(cancelledByPatient("Collector not available in your area")).toBe(false);
    expect(cancelledByPatient(null)).toBe(false);
  });
});

describe("rescheduleTargetProblem", () => {
  // 4 Nov 2026, 9:30 AM in India.
  const now = new Date("2026-11-04T04:00:00Z");

  it("accepts a later slot today and slots within the next week", () => {
    expect(rescheduleTargetProblem("2026-11-04", "10:00-12:00", now)).toBeNull();
    expect(rescheduleTargetProblem(`2026-11-${4 + RESCHEDULE_DAYS_AHEAD}`, "06:00-08:00", now)).toBeNull();
  });

  it("refuses a slot that has started and dates too far ahead", () => {
    expect(rescheduleTargetProblem("2026-11-04", "08:00-10:00", now)).toMatch(/already started/);
    expect(rescheduleTargetProblem("2026-11-03", "16:00-18:00", now)).toMatch(/already started/);
    expect(rescheduleTargetProblem("2026-11-12", "06:00-08:00", now)).toMatch(/next 7 days/);
  });
});
