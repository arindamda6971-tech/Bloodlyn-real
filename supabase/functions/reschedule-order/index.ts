import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeCollectionSlot, parseSlotCapacities } from "../_shared/slot-capacity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.slice(7);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (claimsError || !userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const scheduledDate = typeof body.scheduledDate === "string" ? body.scheduledDate.slice(0, 10) : "";
    const scheduledTimeSlot = typeof body.scheduledTimeSlot === "string" ? body.scheduledTimeSlot : "";
    const slot = normalizeCollectionSlot(scheduledTimeSlot);
    if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !slot) {
      return json({ error: "Invalid reschedule request" }, 400);
    }

    const admin = createClient(url, service);
    const { data: order } = await admin.from("orders").select("vendor_id,status").eq("id", orderId).eq("user_id", userId).maybeSingle();
    if (!order?.vendor_id) return json({ error: "Order or Partner lab not found" }, 404);
    if (String(order.status).toLowerCase() === "cancelled") return json({ error: "Cancelled orders cannot be rescheduled" }, 409);

    const partnerAnon = Deno.env.get("PARTNER_SUPABASE_ANON_KEY");
    if (!partnerAnon) return json({ error: "Slot availability is temporarily unavailable. Please try again.", code: "capacity_unavailable" }, 503);
    const dayOfWeek = new Date(`${scheduledDate}T12:00:00+05:30`).getUTCDay();
    const capacityUrl = new URL("https://wkhwuzsiehrcvlxfeytf.supabase.co/rest/v1/lab_time_slots");
    capacityUrl.searchParams.set("select", "is_open,slot_capacities");
    capacityUrl.searchParams.set("lab_user_id", `eq.${order.vendor_id}`);
    capacityUrl.searchParams.set("day_of_week", `eq.${dayOfWeek}`);
    capacityUrl.searchParams.set("limit", "1");
    const capacityResponse = await fetch(capacityUrl, {
      headers: { apikey: partnerAnon, Authorization: `Bearer ${partnerAnon}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!capacityResponse.ok) return json({ error: "Slot availability is temporarily unavailable. Please try again.", code: "capacity_unavailable" }, 503);
    const rows = await capacityResponse.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const capacity = row?.is_open === true ? parseSlotCapacities(row.slot_capacities)[slot.id] : 0;
    if (capacity === null) return json({ error: "Slot availability is temporarily unavailable. Please try again.", code: "capacity_unavailable" }, 503);

    const { data, error } = await admin.rpc("reschedule_order_with_slot_capacity", {
      _order_id: orderId,
      _user_id: userId,
      _scheduled_date: scheduledDate,
      _scheduled_time_slot: scheduledTimeSlot,
      _slot_capacity: capacity,
    }).single();
    if (error) {
      if (error.details === "slot_capacity_reached" || error.message?.includes("fully booked")) {
        return json({ error: "This collection slot has just filled up. Please choose another time.", code: "slot_capacity_reached" }, 409);
      }
      console.error("Reschedule error:", error);
      return json({ error: "Could not reschedule this order" }, 500);
    }
    return json({ order: data });
  } catch (error) {
    console.error("Unexpected reschedule error:", error);
    return json({ error: "Slot availability is temporarily unavailable. Please try again.", code: "capacity_unavailable" }, 503);
  }
});
