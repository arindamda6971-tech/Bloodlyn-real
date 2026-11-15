import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cleanPrescription } from "../_shared/prescription.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * The doctor's prescription for a consultation, from the Partner Portal
 * (forward-prescription). A digital prescription is stored as data on the order
 * (orders.prescription) so the app can show it and add its tests to the cart; an older
 * sender may still send only a file link (reportUrl). Either way the consultation is
 * completed and its Google Meet link is removed, so it can't be rejoined.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("DOCTOR_APPOINTMENT_WEBHOOK_SECRET");
    if (!webhookSecret || req.headers.get("x-webhook-secret") !== webhookSecret) {
      console.error("Unauthorized: invalid or missing webhook secret");
      return json({ error: "Unauthorized" }, 401);
    }

    const { orderId, reportUrl, prescription: rawPrescription, status = "completed" } = await req.json();
    const prescription = rawPrescription === undefined ? null : cleanPrescription(rawPrescription);
    const fileUrl = typeof reportUrl === "string" && /^https:\/\//.test(reportUrl) ? reportUrl : null;

    if (!orderId || (!fileUrl && !prescription)) {
      return json({ error: "orderId and a prescription (or reportUrl) are required" }, 400);
    }
    if (status !== "completed") {
      return json({ error: "Only a completed consultation can carry a prescription" }, 400);
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: current, error: readError } = await adminClient
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) return json({ error: "Booking not found", code: "order_not_found" }, 404);
    if (String(current.status ?? "").toLowerCase() === "cancelled") {
      return json({ error: "The patient cancelled this booking.", code: "order_cancelled" }, 409);
    }

    const update: Record<string, unknown> = {
      status: "completed",
      call_status: "completed",
      meet_link: null,
      updated_at: new Date().toISOString(),
    };
    if (fileUrl) update.report_url = fileUrl;
    if (prescription) update.prescription = prescription;

    const { data, error } = await adminClient.from("orders").update(update).eq("id", orderId).select("id, status").single();
    if (error) {
      console.error("Error updating order:", error);
      return json({ error: "Failed to update order" }, 500);
    }

    return json({ success: true, order: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
