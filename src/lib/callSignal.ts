import { supabase } from "@/integrations/supabase/client";

/**
 * What the patient did with the doctor's call, told to the doctor. The doctor's
 * appointments live in the partner project, so the patient can't write there directly;
 * the partner's call-signal function checks this patient made the booking and marks the
 * appointment, and the doctor's screen shows it at once ("Patient joined", "Declined",
 * "No answer").
 */
export const PARTNER_CALL_SIGNAL_URL = "https://wkhwuzsiehrcvlxfeytf.supabase.co/functions/v1/call-signal";
// The partner project's public anon key (it ships in the partner portal too). It lets
// the request through the function gateway; the patient's own token goes separately.
const PARTNER_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraHd1enNpZWhyY3ZseGZleXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzE2MTYsImV4cCI6MjEwMTk0NzYxNn0.fFrH7uJ_fCn0hkAlQdf3yLNW5x9LOTE2yAg8jhWyPxM";

/** joined: opened Google Meet. declined: pressed decline. missed: rang out unanswered. */
export type PatientCallEvent = "patient-joined" | "patient-declined" | "patient-missed";

export async function tellDoctor(orderId: string, event: PatientCallEvent): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const res = await fetch(PARTNER_CALL_SIGNAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PARTNER_ANON_KEY}`,
        apikey: PARTNER_ANON_KEY,
        "x-patient-token": token,
        "x-bloodlyn-apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      body: JSON.stringify({ orderId, event }),
      // The patient may leave for Google Meet the moment they join.
      keepalive: true,
    });
    if (!res.ok) console.error(`Call message "${event}" failed`, res.status);
    return res.ok;
  } catch (err) {
    console.error(`Call message "${event}" failed`, err);
    return false;
  }
}
