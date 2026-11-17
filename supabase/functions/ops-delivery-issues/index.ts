import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Bookings that didn't reach the lab's Partner Portal, for BloodLyn Admin.
 *
 *   POST { action: "list" }                    → the open (undelivered) bookings
 *   POST { action: "resend", order_id: "…" }   → send one again
 *
 * Called from the Admin portal with the admin's own sign-in token. That token
 * belongs to the Admin project, so it's checked there: the user must be signed
 * in and hold the super_admin role.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_URL = Deno.env.get("ADMIN_SUPABASE_URL") || "https://yhigcsypzwhbjvaqhhwq.supabase.co";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** The Admin user's ID when the token belongs to a super admin, otherwise the response to send. */
async function requireSuperAdmin(req: Request): Promise<string | Response> {
  const auth = req.headers.get("Authorization") ?? "";
  const adminKey = Deno.env.get("ADMIN_SUPABASE_PUBLISHABLE_KEY");
  if (!adminKey) return json({ error: "Admin connection isn't set up" }, 500);
  if (!auth.toLowerCase().startsWith("bearer ")) return json({ error: "Sign in to Admin first" }, 401);

  const headers = { apikey: adminKey, Authorization: auth };
  const userRes = await fetch(`${ADMIN_URL}/auth/v1/user`, { headers });
  if (!userRes.ok) return json({ error: "Your Admin session has expired. Sign in again." }, 401);
  const user = await userRes.json().catch(() => null);
  const userId = typeof user?.id === "string" ? user.id : null;
  if (!userId) return json({ error: "Your Admin session has expired. Sign in again." }, 401);

  const roleRes = await fetch(
    `${ADMIN_URL}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}&role=eq.super_admin`,
    { headers },
  );
  const rows = roleRes.ok ? await roleRes.json().catch(() => []) : [];
  if (!Array.isArray(rows) || rows.length === 0) return json({ error: "Only a super admin can see this" }, 403);
  return userId;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const who = await requireSuperAdmin(req);
  if (who instanceof Response) return who;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const action = body?.action === "resend" ? "resend" : "list";

  try {
    if (action === "list") {
      const { data: issues, error } = await db
        .from("partner_delivery_issues")
        .select("order_id, order_number, lab_name, attempts, last_status_code, last_error, first_failed_at, last_tried_at")
        .eq("status", "failed")
        .order("first_failed_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      // The booking's current status, so a cancelled one isn't sent again.
      const ids = (issues ?? []).map((i) => i.order_id);
      const statuses: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: orders } = await db.from("orders").select("id, status").in("id", ids);
        for (const o of orders ?? []) statuses[o.id] = o.status;
      }
      return json({
        issues: (issues ?? []).map((i) => ({ ...i, order_status: statuses[i.order_id] ?? null })),
      });
    }

    // resend
    const orderId = typeof body?.order_id === "string" ? body.order_id : "";
    if (!UUID_RE.test(orderId)) return json({ error: "Which booking?" }, 400);

    const [{ data: issue }, { data: order }] = await Promise.all([
      db.from("partner_delivery_issues").select("line_items, status").eq("order_id", orderId).maybeSingle(),
      db.from("orders").select("*").eq("id", orderId).maybeSingle(),
    ]);
    if (!order) return json({ error: "Booking not found" }, 404);
    if (!issue) return json({ error: "This booking has no delivery problem" }, 404);
    if (order.status === "cancelled") return json({ error: "This booking was cancelled, so it isn't sent again" }, 409);

    const res = await fetch(`${supabaseUrl}/functions/v1/partner-hub-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        type: "INSERT",
        table: "orders",
        schema: "public",
        record: order,
        old_record: null,
        line_items: Array.isArray(issue.line_items) ? issue.line_items : undefined,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await res.json().catch(() => null);
    const delivered = res.ok && result?.delivered === true;
    console.log(`Resend of ${order.order_number} by admin ${who}: ${delivered ? "delivered" : "failed"}`);
    return json({
      delivered,
      status: result?.forward?.status ?? null,
      error: delivered ? null : result?.forward?.error || result?.forward?.body || "The lab's portal didn't accept it",
    });
  } catch (e) {
    console.error("ops-delivery-issues error:", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
