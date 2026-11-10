import { supabase } from "@/integrations/supabase/client";

/**
 * Call messages from the patient to the doctor. The doctor's room lives in the partner
 * project, so the patient can't post into it directly; the partner's call-signal
 * function checks this patient made the booking and passes the message on.
 * (Messages from the doctor arrive on the patient's own private channel.)
 */
export const PARTNER_CALL_SIGNAL_URL = "https://wkhwuzsiehrcvlxfeytf.supabase.co/functions/v1/call-signal";
// The partner project's public anon key (it ships in the partner portal too). It lets
// the request through the function gateway; the patient's own token goes separately.
const PARTNER_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraHd1enNpZWhyY3ZseGZleXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzE2MTYsImV4cCI6MjEwMTk0NzYxNn0.fFrH7uJ_fCn0hkAlQdf3yLNW5x9LOTE2yAg8jhWyPxM";

export type PatientCallEvent = "patient-ready" | "webrtc-answer" | "webrtc-hangup";

export async function sendToDoctor(orderId: string, event: PatientCallEvent, payload: Record<string, unknown> = {}): Promise<boolean> {
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
      body: JSON.stringify({ orderId, event, payload }),
      keepalive: event === "webrtc-hangup",
    });
    if (!res.ok) console.error(`Call message "${event}" failed`, res.status);
    return res.ok;
  } catch (err) {
    console.error(`Call message "${event}" failed`, err);
    return false;
  }
}

/**
 * Resolves once the connection has found its network routes (or after a short wait),
 * so the offer/answer can carry them in one message instead of one message per route.
 */
export function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 2500): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    pc.addEventListener("icegatheringstatechange", check);
  });
}
