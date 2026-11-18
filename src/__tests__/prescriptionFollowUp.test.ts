import { describe, it, expect } from "vitest";
import { cleanPrescription } from "../../supabase/functions/_shared/prescription";
import { followUpDateLabel, prescriptionOf } from "@/lib/prescription";

const NOW = new Date("2026-11-18T06:00:00Z");

describe("prescription follow-up date", () => {
  it("keeps a real follow-up date from the doctor and drops anything else", () => {
    const base = { doctor_name: "Dr. A Sen", patient_name: "Pk", diagnosis: "Viral fever", follow_up: "After 1 week" };
    expect(cleanPrescription({ ...base, follow_up_on: "2026-11-25" }, NOW)?.follow_up_on).toBe("2026-11-25");
    expect(cleanPrescription({ ...base, follow_up_on: "next week" }, NOW)?.follow_up_on).toBe("");
    expect(cleanPrescription({ ...base, follow_up_on: 20261125 }, NOW)?.follow_up_on).toBe("");
    expect(cleanPrescription(base, NOW)?.follow_up_on).toBe("");
  });

  it("shows the date to the patient, and nothing for older prescriptions without one", () => {
    const rx = prescriptionOf({ prescription: { diagnosis: "Fever", follow_up: "After 1 week", follow_up_on: "2026-11-25" } })!;
    expect(rx.follow_up_on).toBe("2026-11-25");
    expect(followUpDateLabel(rx)).toMatch(/25 Nov/);
    const older = prescriptionOf({ prescription: { diagnosis: "Fever", follow_up: "After 5 days" } })!;
    expect(older.follow_up_on).toBe("");
    expect(followUpDateLabel(older)).toBe("");
  });
});
