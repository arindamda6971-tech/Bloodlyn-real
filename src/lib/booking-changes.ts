/**
 * Patients can cancel or reschedule until the lab assigns a collection partner.
 * Mirrors public.customer_can_change_order in the database, which has the final say.
 */
const CHANGEABLE_STATUSES = new Set(["pending", "confirmed", "accepted", "collection_pending"]);

interface BookingLike {
  status?: string | null;
  is_escalated?: boolean | null;
  delivery_partner_name?: string | null;
  delivery_partner_phone?: string | null;
  phlebotomist_id?: string | null;
}

export function canPatientChangeBooking(order: BookingLike | null | undefined): boolean {
  if (!order) return false;
  return (
    CHANGEABLE_STATUSES.has(String(order.status ?? "").toLowerCase()) &&
    !order.is_escalated &&
    !order.delivery_partner_name?.trim() &&
    !order.delivery_partner_phone?.trim() &&
    !order.phlebotomist_id
  );
}

/**
 * Whether a time can be picked when rescheduling, from the lab's own saved
 * schedule only. A time with no saved place count is one the lab hasn't set up.
 */
export function rescheduleSlotState(input: {
  started: boolean;
  isCurrentBooking: boolean;
  availability?: { capacity: number | null; remaining: number | null } | null;
}): { disabled: boolean; note: string } {
  const { started, isCurrentBooking, availability } = input;
  if (started) return { disabled: true, note: "Started" };
  if (isCurrentBooking) return { disabled: true, note: "Your booking" };
  if (availability?.capacity == null || availability.capacity === 0) return { disabled: true, note: "Not offered" };
  if (availability.remaining === 0) return { disabled: true, note: "Full" };
  return { disabled: false, note: availability.remaining != null ? `${availability.remaining} left` : "" };
}

/** Reasons offered when a patient cancels; the chosen one is shown to the lab. */
export const CANCEL_REASONS = [
  "My plans changed",
  "Booked by mistake",
  "Couldn't prepare (fasting or medicines)",
  "Booked with another lab",
  "Other reason",
] as const;

/** True when the lab, not the patient, cancelled: the patient should hear why. */
export const cancelledByPatient = (reason: string | null | undefined) => /^cancelled by patient/i.test(reason?.trim() ?? "");
