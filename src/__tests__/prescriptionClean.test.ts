import { describe, it, expect } from "vitest";
import { cleanPrescription } from "../../supabase/functions/_shared/prescription";

const NOW = new Date("2026-11-15T10:00:00Z");

describe("cleanPrescription", () => {
  it("keeps a doctor's prescription with medicines and catalog tests", () => {
    const p = cleanPrescription({
      doctor_name: "Dr. A Sen",
      patient_name: "Pk",
      diagnosis: "Viral fever",
      medicines: [{ name: "Paracetamol 650", dosage: "1 tablet", frequency: "Three times a day", duration: "5 days", instructions: "After food" }],
      tests: [{ id: "17452ffd-aade-4009-9017-cd7a0cc1eb7c", name: "COMPLETE BLOOD COUNT" }, { id: "629f1880-ac6a-49e8-a13d-8366afd5b67e", name: "DENGUE NS1 ANTIGEN" }],
      advice: "Drink plenty of water",
      follow_up: "After 5 days",
    }, NOW);
    expect(p).toMatchObject({
      issued_at: NOW.toISOString(),
      diagnosis: "Viral fever",
      medicines: [{ name: "Paracetamol 650", frequency: "Three times a day" }],
      tests: [{ id: "17452ffd-aade-4009-9017-cd7a0cc1eb7c", name: "COMPLETE BLOOD COUNT" }, { name: "DENGUE NS1 ANTIGEN" }],
    });
  });

  it("drops empty rows, repeated tests, unknown fields and bad ids", () => {
    const p = cleanPrescription({
      notes: "  Rest  ",
      medicines: [{ name: "" }, { name: "ORS", extra: "x" }],
      tests: [{ id: "abc'; drop", name: "Thyroid" }, { name: "Thyroid" }, { name: "" }],
      evil: "<script>",
    }, NOW)!;
    expect(p.notes).toBe("Rest");
    expect(p.medicines).toEqual([{ name: "ORS", dosage: "", frequency: "", duration: "", instructions: "" }]);
    expect(p.tests).toEqual([{ id: null, name: "Thyroid" }]);
    expect(p).not.toHaveProperty("evil");
  });

  it("caps long text and long lists", () => {
    const p = cleanPrescription({ diagnosis: "x".repeat(5000), medicines: Array.from({ length: 50 }, (_, i) => ({ name: `M${i}` })) }, NOW)!;
    expect(p.diagnosis).toHaveLength(1000);
    expect(p.medicines).toHaveLength(30);
  });

  it("refuses an empty prescription or something that isn't one", () => {
    expect(cleanPrescription({ doctor_name: "Dr. A" }, NOW)).toBeNull();
    expect(cleanPrescription(null, NOW)).toBeNull();
    expect(cleanPrescription([1, 2], NOW)).toBeNull();
  });
});
