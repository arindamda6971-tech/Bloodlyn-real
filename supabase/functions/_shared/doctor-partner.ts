// Sends a doctor booking (or its cancellation) to the Partner project's
// doctor-appointment-webhook, retrying a failed attempt. The Partner side stores a
// booking once per order id, so sending it again is safe.

export const DOCTOR_APPOINTMENT_WEBHOOK_URL =
  "https://wkhwuzsiehrcvlxfeytf.supabase.co/functions/v1/doctor-appointment-webhook";

/** "Video Call with Dr A (Patient)" etc: how a doctor booking's test_name reads. */
export const CONSULT_TEST_NAME = /^(Video Call|Audio Call|Physical Appointment|Clinic Visit) with /i;

export interface DeliveryResult {
  ok: boolean;
  /** The Partner side refused the booking itself (e.g. the doctor is no longer approved). */
  refused: boolean;
  status: number | null;
  code: string | null;
}

interface DeliverOptions {
  attempts?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function deliverToDoctor(
  payload: Record<string, unknown>,
  secret: string,
  { attempts = 3, timeoutMs = 6000, fetchImpl = fetch, wait = sleep }: DeliverOptions = {},
): Promise<DeliveryResult> {
  let status: number | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await wait(400 * attempt);
    try {
      const res = await fetchImpl(DOCTOR_APPOINTMENT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      status = res.status;
      if (res.ok) return { ok: true, refused: false, status, code: null };
      const body = await res.json().catch(() => null);
      console.error("Doctor webhook answered", status, body);
      // A refusal won't change on retry; a server error or rate limit might.
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return { ok: false, refused: true, status, code: typeof body?.code === "string" ? body.code : null };
      }
    } catch (err) {
      console.error(`Doctor webhook attempt ${attempt + 1} failed:`, err);
    }
  }
  return { ok: false, refused: false, status, code: null };
}
