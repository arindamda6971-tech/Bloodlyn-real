import { describe, it, expect } from "vitest";
import { cleanPrescription } from "../../supabase/functions/_shared/prescription";
import { prescriptionOf } from "@/lib/prescription";

describe("Prescription letterhead", () => {
  it("keeps the doctor's specialty and registration, and nothing like a phone number field", () => {
    const rx = cleanPrescription({
      doctor_name: "Dr. A Sen",
      doctor_qualification: "MBBS, MD (Medicine)",
      doctor_specialty: "General Physician",
      doctor_registration: "Reg. No. 12345 (West Bengal Medical Council)",
      doctor_phone: "9000000000",
      diagnosis: "Viral fever",
    })!;
    expect(rx.doctor_specialty).toBe("General Physician");
    expect(rx.doctor_registration).toBe("Reg. No. 12345 (West Bengal Medical Council)");
    expect(JSON.stringify(rx)).not.toContain("9000000000");
  });

  it("reads older prescriptions that were sent without them", () => {
    const rx = prescriptionOf({ prescription: { doctor_name: "Dr. A Sen", diagnosis: "Viral fever", medicines: [], tests: [] } })!;
    expect(rx.doctor_specialty).toBe("");
    expect(rx.doctor_registration).toBe("");
  });
});
