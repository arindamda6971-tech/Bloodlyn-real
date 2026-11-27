import { reportError } from "@/lib/reportError";

/**
 * create-order's refusals that tell the patient why. Nothing broke, so they aren't
 * reported: a full slot, an area the lab doesn't serve, a missing prescription.
 * Anything else (the server down, capacity lookup failing, a doctor who can't be
 * reached, a slot the app sent wrong) is.
 */
export const EXPECTED_BOOKING_CODES: ReadonlySet<string> = new Set([
  "already_booked",
  "doctor_fully_booked",
  "doctor_not_accepting",
  "doctor_unavailable",
  "fee_changed",
  "lab_not_serviceable",
  "offer_unavailable",
  "prescription_required",
  "slot_capacity_reached",
  "vendor_not_approved",
]);

/** create-order's JSON answer, when it gave one: `{ error, code }`. */
export interface BookingAnswer {
  code?: unknown;
  error?: unknown;
}

/**
 * The JSON answer behind a refused `functions.invoke`, which hides it in
 * `error.context` (a fetch Response). Reads a copy, so the caller can still read it too.
 */
export async function readRefusal(error: unknown): Promise<BookingAnswer | null> {
  const ctx = (error as { context?: { clone?: () => { json?: () => Promise<unknown> } } } | null)?.context;
  try {
    const body = await ctx?.clone?.().json?.();
    return body && typeof body === "object" ? (body as BookingAnswer) : null;
  } catch {
    return null;
  }
}

/**
 * Reports a booking that failed to `client_errors`, as
 * `Booking failed (BP): Slot availability is temporarily unavailable…, code capacity_unavailable, HTTP 503`.
 * Expected refusals are skipped. Never throws.
 */
export function reportBookingFailure(what: string, error: unknown, answer?: BookingAnswer | null): Promise<void> {
  const code = typeof answer?.code === "string" ? answer.code : "";
  if (EXPECTED_BOOKING_CODES.has(code)) return Promise.resolve();
  const status = (error as { context?: { status?: unknown } } | null)?.context?.status;
  const serverSaid = typeof answer?.error === "string" ? answer.error : "";
  const reason = serverSaid || (error instanceof Error ? error.message : error ? String(error) : "no order came back");
  const detail = [reason, code && `code ${code}`, typeof status === "number" && `HTTP ${status}`].filter(Boolean).join(", ");
  const report = new Error(detail);
  if (error instanceof Error && error.stack) report.stack = error.stack;
  return reportError(report, `Booking failed (${what})`);
}

/**
 * For cancel and reschedule. A 4xx is the server refusing with a reason the patient is
 * shown ("A collection partner is already assigned…"), so only a 5xx, a request that
 * never got an answer, or an error inside a 200 is reported.
 */
export function reportBookingChangeFailure(what: string, error: unknown, answer?: BookingAnswer | null): Promise<void> {
  const status = (error as { context?: { status?: unknown } } | null)?.context?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return Promise.resolve();
  return reportBookingFailure(what, error, answer);
}
