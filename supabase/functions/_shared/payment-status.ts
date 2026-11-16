/**
 * An order's payment state, in one place for the order functions and the app.
 *
 * BloodLyn has no cash: patients pay online after the sample is collected (or after the
 * consultation or the visit). So a new booking is "pending" (payment due) and becomes
 * "paid" only when the payment is confirmed.
 */
export const PAYMENT_DUE = "pending";
export const PAYMENT_PAID = "paid";

/**
 * TESTING PHASE ONLY. No payment gateway is connected yet, so a patient answering "Yes"
 * to "Is your blood collected?" counts as the online payment: the order turns "paid" and
 * the lab gets it for its report, and the whole flow can be tested.
 *
 * When Razorpay goes live, set this to false and let the gateway's confirmed payment set
 * PAYMENT_PAID instead.
 */
export const COLLECTION_CONFIRMATION_COUNTS_AS_PAYMENT = true;

/**
 * Words that mean the payment is confirmed. "completed" is deliberately not one: every
 * order used to be saved as "completed" before anything was paid.
 */
const PAID_WORDS = new Set(["paid", "captured", "success", "successful"]);

export const isPaidStatus = (status: unknown): boolean => PAID_WORDS.has(String(status ?? "").trim().toLowerCase());

const CONSULTATION = /^(Video Call|Audio Call|Physical Appointment|Clinic Visit) with /i;
const VITAL = /(home\s*bp|bp\s*check|blood\s*pressure|ecg|electrocardiogram)/i;

/** A doctor consultation, as the consult flow names the order. */
export const isConsultationName = (testName: unknown): boolean => CONSULTATION.test(String(testName ?? "").trim());

/** A BP or ECG visit with no blood test in it. Order names list the items as "A | B". */
export function isVitalsOnlyName(testName: unknown): boolean {
  const items = String(testName ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  return items.length > 0 && items.every((item) => VITAL.test(item));
}

/**
 * Testing phase: whether the patient's "Yes, my blood is collected" pays for this order.
 * Only a blood test that isn't paid yet; consultations and BP / ECG visits are paid
 * through their own steps.
 */
export function collectionConfirmationPays(order: { test_name?: string | null; payment_status?: string | null }): boolean {
  return (
    COLLECTION_CONFIRMATION_COUNTS_AS_PAYMENT &&
    !isConsultationName(order.test_name) &&
    !isVitalsOnlyName(order.test_name) &&
    !isPaidStatus(order.payment_status)
  );
}
