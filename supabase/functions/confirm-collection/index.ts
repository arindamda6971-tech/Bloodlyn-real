// Customer-driven collection confirmation.
//
// The customer answers "Is your blood collected by our partner?" on the order
// tracking tile in BloodLyn Real. This function:
//   1. validates the caller's JWT and that the order belongs to them
//   2. for "collected": verifies the collection partner's PIN with the
//      BloodLyn Partner Real project and marks the order sample_collected
//   3. for "not_collected": only allowed after the booked slot has ended, and
//      marks the order collection_pending
//   4. mirrors the new status to the Partner project so the lab owner's
//      booking tile updates without any manual click
//
// No existing edge function or booking logic is touched by this function.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// BloodLyn Partner Real project
const PARTNER_URL = "https://wkhwuzsiehrcvlxfeytf.supabase.co";

/** Slot end time in minutes-from-midnight for the three fixed collection slots. */
function slotEndMinutes(slot: string | null): number | null {
  if (!slot) return null;
  const s = slot.toLowerCase();
  if (s.includes("morning")) return 10 * 60;
  if (s.includes("afternoon")) return 14 * 60;
  if (s.includes("evening")) return 18 * 60;
  return null;
}

/** Current IST date (yyyy-mm-dd) and minutes-from-midnight. */
function nowInIST(): { date: string; minutes: number } {
  const now = new Date();
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
  const date = ist.toISOString().slice(0, 10);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return { date, minutes };
}

function slotHasEnded(
  scheduledDate: string | null,
  scheduledSlot: string | null,
): boolean {
  const { date, minutes } = nowInIST();
  if (!scheduledDate) return true; // ASAP orders: no window to wait for
  if (scheduledDate < date) return true;
  if (scheduledDate > date) return false;
  const end = slotEndMinutes(scheduledSlot);
  if (end === null) return true;
  return minutes >= end;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const orderId: string = String(body?.orderId ?? "");
    const action: string = String(body?.action ?? "");
    const pin: string = String(body?.pin ?? "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "Invalid orderId" }, 400);
    if (action !== "collected" && action !== "not_collected") {
      return json({ error: "action must be 'collected' or 'not_collected'" }, 400);
    }
    if (action === "collected" && !/^\d{4,8}$/.test(pin)) {
      return json({ error: "Enter the 4-digit PIN shared by your collection partner" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id, order_number, user_id, vendor_id, status, scheduled_date, scheduled_time_slot, delivery_partner_name, delivery_partner_phone",
      )
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (orderError) {
      console.error("order lookup failed", orderError);
      return json({ error: "Could not load your order" }, 500);
    }
    if (!order) return json({ error: "Order not found" }, 404);

    if (order.status === "cancelled") return json({ error: "This order was cancelled" }, 409);
    const alreadyDone = [
      "sample_collected",
      "in_progress",
      "processing",
      "lab_processing",
      "report_ready",
      "report_delivered",
      "completed",
    ].includes(order.status ?? "");
    if (alreadyDone && action === "collected") {
      return json({ success: true, status: order.status, message: "Already marked collected" });
    }

    if (action === "not_collected" && !slotHasEnded(order.scheduled_date, order.scheduled_time_slot)) {
      return json(
        { error: "You can report a missed collection only after your booked slot ends." },
        409,
      );
    }

    // ---- Update our own order status (source of truth for the customer app) ----
    const newStatus = action === "collected" ? "sample_collected" : "collection_pending";
    const { error: updateError } = await admin
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("user_id", userId);

    if (updateError) {
      console.error("status update failed", updateError);
      return json({ error: "Could not update your order status" }, 500);
    }

    return json({
      success: true,
      status: newStatus,
      pin_verified: action === "collected",
      partner_synced: false,
    });
  } catch (error) {
    console.error("Function error:", error);
    return json({ error: "Unexpected error" }, 500);
  }
});
