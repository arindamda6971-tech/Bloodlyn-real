import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({ orderId: z.string().uuid() }).strict();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const VITALS_PATTERN = /(?:home\s*bp|bp\s*check|blood\s*pressure|ecg|electrocardiogram)/i;
const ASSIGNED_STATUSES = new Set(["assigned", "partner_assigned", "out_for_collection", "processing"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Service is temporarily unavailable" }, 503);

    const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(url, anonKey);
    const { data: auth, error: authError } = await userClient.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "Unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid order" }, 400);

    const admin = createClient(url, serviceKey);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, user_id, status, test_name, delivery_partner_name, delivery_partner_phone")
      .eq("id", parsed.data.orderId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (orderError) return json({ error: "Could not load your order" }, 500);
    if (!order) return json({ error: "Order not found" }, 404);

    const status = String(order.status ?? "").toLowerCase();
    if (status === "completed" || status === "checked") {
      return json({ success: true, status: "completed", message: "Already completed" });
    }
    if (status === "cancelled") return json({ error: "This order was cancelled" }, 409);
    if (!VITALS_PATTERN.test(String(order.test_name ?? ""))) {
      return json({ error: "This confirmation is only available for BP and ECG orders" }, 409);
    }
    if (!ASSIGNED_STATUSES.has(status)) {
      return json({ error: "A service partner must be assigned before completion" }, 409);
    }
    if (!order.delivery_partner_name && !order.delivery_partner_phone) {
      return json({ error: "Service partner details are missing" }, 409);
    }

    const { data: updated, error: updateError } = await admin
      .from("orders")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("user_id", auth.user.id)
      .in("status", Array.from(ASSIGNED_STATUSES))
      .select("status")
      .maybeSingle();

    if (updateError) return json({ error: "Could not complete your order" }, 500);
    if (!updated) return json({ error: "Order status changed. Please refresh and try again." }, 409);

    return json({ success: true, status: "completed" });
  } catch (error) {
    console.error("confirm-vitals-service error", error);
    return json({ error: "Could not complete your order" }, 500);
  }
});