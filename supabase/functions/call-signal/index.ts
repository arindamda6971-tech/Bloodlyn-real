// Doctor -> patient call signalling.
//
// The patient listens on the private Realtime channel `webrtc-{orderId}` in this
// project, which only the order's owner may join. The doctor is a user of the partner
// project, so they can't join it; instead the doctor portal posts each call message
// here with the doctor's partner session token (in x-doctor-token; Authorization
// carries this project's public anon key so JWT verification stays on). We check that token with the partner
// project, check this doctor is the one booked on the order, and broadcast the message
// into the patient's private channel. The room itself stays private.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PARTNER_URL = "https://wkhwuzsiehrcvlxfeytf.supabase.co";
// What a doctor may send: announce they're in the room, the offer, and hang-up.
const DOCTOR_EVENTS = new Set(["doctor-ready", "webrtc-offer", "webrtc-hangup"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 32_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-partner-apikey, x-doctor-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Token -> doctor id, so a call's handful of messages costs one auth lookup.
const verified = new Map<string, { userId: string; until: number }>();

async function partnerUserId(token: string, apikey: string): Promise<string | null> {
  const hit = verified.get(token);
  if (hit && hit.until > Date.now()) return hit.userId;
  const res = await fetch(`${PARTNER_URL}/auth/v1/user`, {
    headers: { apikey, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  if (!user?.id) return null;
  verified.set(token, { userId: user.id, until: Date.now() + 5 * 60_000 });
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const token = req.headers.get("x-doctor-token");
    // The partner anon key is public; it only lets us ask the partner project who the token belongs to.
    const partnerKey = Deno.env.get("PARTNER_SUPABASE_ANON_KEY") || req.headers.get("x-partner-apikey");
    if (!token || !partnerKey) return json({ error: "Unauthorized" }, 401);

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Message too large" }, 413);
    const { orderId, event, payload } = JSON.parse(raw || "{}");
    if (typeof orderId !== "string" || !UUID.test(orderId) || !DOCTOR_EVENTS.has(event)) {
      return json({ error: "Invalid message" }, 400);
    }

    const doctorId = await partnerUserId(token, partnerKey);
    if (!doctorId) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);
    const { data: order } = await admin
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("vendor_id", doctorId)
      .maybeSingle();
    if (!order) return json({ error: "Forbidden" }, 403);

    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ topic: `webrtc-${orderId}`, event, payload: payload ?? {}, private: true }],
      }),
    });
    if (!res.ok) {
      console.error("broadcast failed", res.status, await res.text().catch(() => ""));
      return json({ error: "Couldn't reach the patient" }, 502);
    }
    return json({ success: true });
  } catch (err) {
    console.error("call-signal error", err);
    return json({ error: "Internal server error" }, 500);
  }
});
