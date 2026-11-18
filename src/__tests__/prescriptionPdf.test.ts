import { describe, it, expect } from "vitest";
import { buildPrescriptionPdf, pdfText, prescriptionFileName } from "@/lib/prescription-pdf";
import { prescriptionOf } from "@/lib/prescription";

const rx = prescriptionOf({
  prescription: {
    doctor_name: "Dr Ar Das",
    doctor_qualification: "MBBS",
    doctor_specialty: "Family Medicine",
    patient_name: "Pk",
    patient_age: "43",
    patient_gender: "Female",
    diagnosis: "Viral fever",
    notes: "Fever for 3 days",
    medicines: [{ name: "Paracetamol 650", dosage: "1 tablet", frequency: "Three times a day", duration: "5 days", instructions: "After food" }],
    tests: [{ id: "t1", name: "COMPLETE BLOOD COUNT" }],
    advice: "Drink plenty of water",
    follow_up: "After 1 week",
    follow_up_on: "2026-11-25",
  },
})!;

const info = { doctorTitle: "Dr Ar Das", registration: "Reg. No. 12345 (West Bengal Medical Council)", issued: new Date(2026, 10, 18), reference: "HS20261118-3788", followUpOn: "Wed, 25 Nov" };

const read = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(String(r.result));
    r.readAsText(blob);
  });
const pages = async (blob: Blob) => {
  const raw = await read(blob);
  return (raw.match(/\/Type \/Page\b(?!s)/g) ?? []).length;
};

describe("prescription PDF", () => {
  it("makes a one-page A4 PDF for a normal prescription", async () => {
    const blob = await buildPrescriptionPdf(rx, info);
    expect(blob.type).toBe("application/pdf");
    expect((await read(blob)).startsWith("%PDF-")).toBe(true);
    expect(await pages(blob)).toBe(1);
  });

  it("runs on to more pages when the doctor writes a lot", async () => {
    const long = { ...rx, medicines: Array.from({ length: 30 }, (_, i) => ({ ...rx.medicines[0], name: `Medicine ${i + 1}` })) };
    expect(await pages(await buildPrescriptionPdf(long, info))).toBeGreaterThan(1);
  });

  it("swaps characters the PDF font can't draw", () => {
    expect(pdfText("Take “one” tablet – ₹50 … ℞")).toBe('Take "one" tablet - Rs. 50 ... Rx');
    expect(pdfText("জ্বর Fever")).toBe("Fever");
  });

  it("names the file after the doctor and the day", () => {
    expect(prescriptionFileName("Dr. Ar Das", new Date(2026, 10, 18))).toBe("Prescription-Dr-Ar-Das-18-Nov-2026.pdf");
  });
});
