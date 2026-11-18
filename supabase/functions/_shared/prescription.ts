/**
 * A doctor's digital prescription, as the Partner Portal sends it and the patient's
 * app stores it (orders.prescription). Everything is cleaned here: text is trimmed and
 * capped, lists are capped, and unknown fields are dropped. The app shows it as plain
 * text, never as HTML. The same file is in partner-pro supabase/functions/_shared.
 */

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionTest {
  /** The Admin catalog test id, when the doctor picked it from the catalog. */
  id: string | null;
  name: string;
}

export interface Prescription {
  issued_at: string;
  doctor_name: string;
  doctor_qualification: string;
  /** The doctor's specialty, e.g. "General Physician". */
  doctor_specialty: string;
  /** Medical council registration, e.g. "Reg. No. 12345 (West Bengal Medical Council)". Never a phone number. */
  doctor_registration: string;
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  diagnosis: string;
  notes: string;
  medicines: PrescriptionMedicine[];
  tests: PrescriptionTest[];
  advice: string;
  follow_up: string;
  /** The follow-up date the doctor picked, YYYY-MM-DD, or "" for none. */
  follow_up_on: string;
}

const MAX_ITEMS = 30;
const DATE_RE = new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$");

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+\n/g, "\n").trim().slice(0, max) : "";

const testId = (value: unknown): string | null =>
  typeof value === "string" && /^[A-Za-z0-9-]{1,64}$/.test(value) ? value : null;

/** The cleaned prescription, or null when it holds nothing a patient could use. */
export function cleanPrescription(input: unknown, now = new Date()): Prescription | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;

  const medicines = (Array.isArray(raw.medicines) ? raw.medicines : [])
    .map((m) => (m && typeof m === "object" ? (m as Record<string, unknown>) : {}))
    .map((m) => ({
      name: text(m.name, 120),
      dosage: text(m.dosage, 60),
      frequency: text(m.frequency, 60),
      duration: text(m.duration, 60),
      instructions: text(m.instructions, 200),
    }))
    .filter((m) => m.name)
    .slice(0, MAX_ITEMS);

  const seen = new Set<string>();
  const tests = (Array.isArray(raw.tests) ? raw.tests : [])
    .map((t) => (t && typeof t === "object" ? (t as Record<string, unknown>) : {}))
    .map((t) => ({ id: testId(t.id), name: text(t.name, 200) }))
    .filter((t) => {
      const key = (t.id ?? t.name).toLowerCase();
      if (!t.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ITEMS);

  const issued = typeof raw.issued_at === "string" && !Number.isNaN(Date.parse(raw.issued_at)) ? raw.issued_at : now.toISOString();
  const prescription: Prescription = {
    issued_at: issued,
    doctor_name: text(raw.doctor_name, 120),
    doctor_qualification: text(raw.doctor_qualification, 160),
    doctor_specialty: text(raw.doctor_specialty, 120),
    doctor_registration: text(raw.doctor_registration, 160),
    patient_name: text(raw.patient_name, 120),
    patient_age: text(raw.patient_age, 20),
    patient_gender: text(raw.patient_gender, 20),
    diagnosis: text(raw.diagnosis, 1000),
    notes: text(raw.notes, 4000),
    medicines,
    tests,
    advice: text(raw.advice, 2000),
    follow_up: text(raw.follow_up, 200),
    follow_up_on: typeof raw.follow_up_on === "string" && DATE_RE.test(raw.follow_up_on) ? raw.follow_up_on : "",
  };

  const hasContent = prescription.diagnosis || prescription.notes || medicines.length || tests.length || prescription.advice;
  return hasContent ? prescription : null;
}
