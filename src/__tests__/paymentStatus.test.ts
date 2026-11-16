import { describe, it, expect } from "vitest";
import {
  COLLECTION_CONFIRMATION_COUNTS_AS_PAYMENT,
  PAYMENT_DUE,
  PAYMENT_PAID,
  collectionConfirmationPays,
  isConsultationName,
  isPaidStatus,
  isVitalsOnlyName,
} from "../../supabase/functions/_shared/payment-status";

describe("Payment status", () => {
  it("books as payment due, and only a confirmed payment counts as paid", () => {
    expect(PAYMENT_DUE).toBe("pending");
    expect(isPaidStatus(PAYMENT_DUE)).toBe(false);
    expect(isPaidStatus(PAYMENT_PAID)).toBe(true);
    expect(isPaidStatus(" Paid ")).toBe(true);
    expect(isPaidStatus("captured")).toBe(true);
    // Every order used to say "completed" before anything was paid.
    expect(isPaidStatus("completed")).toBe(false);
    expect(isPaidStatus(null)).toBe(false);
  });

  it("tells doctor consultations and BP / ECG visits apart from blood tests", () => {
    expect(isConsultationName("Video Call with Dr Ar Das (Pk)")).toBe(true);
    expect(isConsultationName("CBC | Lipid Profile")).toBe(false);
    expect(isVitalsOnlyName("Home BP Check")).toBe(true);
    expect(isVitalsOnlyName("BP Check | 12-Lead ECG")).toBe(true);
    expect(isVitalsOnlyName("CBC | BP Check")).toBe(false);
    expect(isVitalsOnlyName("")).toBe(false);
  });

  it("in the testing phase, the patient's Yes pays for an unpaid blood test only", () => {
    expect(COLLECTION_CONFIRMATION_COUNTS_AS_PAYMENT).toBe(true);
    expect(collectionConfirmationPays({ test_name: "CBC | Lipid Profile", payment_status: "pending" })).toBe(true);
    expect(collectionConfirmationPays({ test_name: "CBC | BP Check", payment_status: "pending" })).toBe(true);
    expect(collectionConfirmationPays({ test_name: "CBC", payment_status: "paid" })).toBe(false);
    expect(collectionConfirmationPays({ test_name: "Home BP Check", payment_status: "pending" })).toBe(false);
    expect(collectionConfirmationPays({ test_name: "Audio Call with Dr Ar Das (Pk)", payment_status: "pending" })).toBe(false);
  });
});
