/**
 * The doctor's digital prescription on a consultation (orders.prescription), as the
 * Partner Portal sends it (cleaned by supabase/functions/_shared/prescription.ts).
 * Always shown as plain text. Its tests are BloodLyn catalog tests, so the patient can
 * add them to the cart and choose a lab.
 */
import type { Prescription, PrescriptionMedicine, PrescriptionTest } from "../../supabase/functions/_shared/prescription";

export type { Prescription, PrescriptionMedicine, PrescriptionTest };

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** The order's prescription, or null when it has none (or an unreadable one). */
export function prescriptionOf(order: { prescription?: unknown } | null | undefined): Prescription | null {
  const raw = order?.prescription;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") as Record<string, unknown>[] : []);
  const medicines = list(p.medicines)
    .map((m) => ({ name: str(m.name), dosage: str(m.dosage), frequency: str(m.frequency), duration: str(m.duration), instructions: str(m.instructions) }))
    .filter((m) => m.name);
  const tests = list(p.tests)
    .map((t) => ({ id: typeof t.id === "string" ? t.id : null, name: str(t.name) }))
    .filter((t) => t.name);
  return {
    issued_at: str(p.issued_at),
    doctor_name: str(p.doctor_name),
    doctor_qualification: str(p.doctor_qualification),
    patient_name: str(p.patient_name),
    patient_age: str(p.patient_age),
    patient_gender: str(p.patient_gender),
    diagnosis: str(p.diagnosis),
    notes: str(p.notes),
    medicines,
    tests,
    advice: str(p.advice),
    follow_up: str(p.follow_up),
  };
}

/** "1 tablet · Three times a day · 5 days" */
export const medicineLine = (m: PrescriptionMedicine) => [m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ");

/** A test's display name (catalog names can carry a second line listing what's included). */
export const testTitle = (t: PrescriptionTest) => t.name.split(/\r?\n/)[0].trim();

/**
 * The prescribed tests as cart items without a lab yet: the cart sends the patient to
 * lab selection, which matches them to each lab's prices.
 */
export function prescriptionCartItems(p: Prescription) {
  return p.tests.map((t, i) => ({
    id: t.id ?? `rx-${i}-${testTitle(t).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: t.name,
    price: 0,
    kind: "test" as const,
    category: "Prescribed by your doctor",
  }));
}
