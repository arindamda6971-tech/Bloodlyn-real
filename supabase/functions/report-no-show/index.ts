import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2.110.0/cors";
import { z } from "https://esm.sh/zod@3.25.76";

const schema = z.object({ orderId: z.string().uuid(), comment: z.string().trim().min(3).max(1000) }).strict();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !key) return json({ error: "Reporting is temporarily unavailable" }, 503);
    const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(url, anon);
    const { data: auth, error: authError } = await userClient.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "Unauthorized" }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Enter a comment of 3–1000 characters and a valid order" }, 400);
    const admin = createClient(url, key);
    const { data: order, error } = await admin.rpc("escalate_no_show", {
      _order_id: parsed.data.orderId, _user_id: auth.user.id, _comment: parsed.data.comment,
    }).single();
    if (error || !order) {
      const code = error?.code;
      return json({ error: code === "P0002" ? "Order not found" : code === "22023" ? error?.message : "Could not report your order. Please try again." }, code === "P0002" ? 404 : code === "22023" ? 409 : 500);
    }
    // A dedicated event endpoint avoids the existing receiver's full-order upsert.
    // The durable queue is committed atomically with cancellation; retries reuse it.
    const { data: delivery } = await admin.from("no_show_deliveries").select("delivered_at").eq("order_id", order.id).maybeSingle();
    let partnerSynced = !!delivery?.delivered_at;
    const secret = Deno.env.get("PARTNER_WEBHOOK_SECRET");
    if (!partnerSynced && secret) {
      try {
        const response = await fetch("https://wkhwuzsiehrcvlxfeytf.supabase.co/functions/v1/partner-no-show-receiver", {
          method: "POST", headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({ event: "order.no_show", order_id: order.id, external_order_id: order.id,
            vendor_id: order.vendor_id, status: "cancelled", is_escalated: true,
            escalation_comment: order.escalation_comment, cancellation_reason: order.cancellation_reason,
            escalated_at: order.escalated_at, cancelled_at: order.cancelled_at }),
        });
        const result = await response.json().catch(() => null);
        if (response.ok && result?.success === true) {
          const { error: queueError } = await admin.from("no_show_deliveries").update({ delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("order_id", order.id);
          partnerSynced = !queueError;
        }
      } catch {
        console.warn("No-show Partner delivery remains pending");
      }
    }
    return json({ success: true, status: "cancelled", is_escalated: true, partner_synced: partnerSynced });
  } catch {
    return json({ error: "Could not report your order. Please try again." }, 500);
  }
});