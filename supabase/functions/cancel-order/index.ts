import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2.110.0/cors";
import { z } from "https://esm.sh/zod@3.25.76";
import { CONSULT_TEST_NAME, deliverToDoctor } from "../_shared/doctor-partner.ts";

// Patients cancel until the lab assigns a collection partner; the database
// function holds that rule so the app and the server can't disagree.
// A doctor consultation is cancelled the same way, and the doctor is told.
const schema = z.object({ orderId: z.string().uuid(), reason: z.string().trim().max(200).optional() }).strict();
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
    if (!url || !anon || !key) return json({ error: "Cancelling is temporarily unavailable" }, 503);
    const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(url, anon);
    const { data: auth, error: authError } = await userClient.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "Unauthorized" }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid cancel request" }, 400);

    const admin = createClient(url, key);
    const { data: order, error } = await admin.rpc("cancel_order_by_customer", {
      _order_id: parsed.data.orderId, _user_id: auth.user.id, _reason: parsed.data.reason ?? "",
    }).single();
    if (error || !order) {
      if (error?.code === "P0002") return json({ error: "Order not found" }, 404);
      if (error?.code === "22023") return json({ error: error.message, code: error.details || "not_changeable" }, 409);
      console.error("cancel-order error:", error);
      return json({ error: "Could not cancel this booking. Please try again." }, 500);
    }

    // A doctor consultation: the doctor's list drops it too. If this doesn't get through,
    // the doctor is still told the moment they try to ring (update-call-status refuses).
    let doctorTold: boolean | undefined;
    const cancelled = order as { id: string; test_name?: string | null };
    if (CONSULT_TEST_NAME.test((cancelled.test_name ?? "").trim())) {
      const secret = Deno.env.get("DOCTOR_APPOINTMENT_WEBHOOK_SECRET");
      doctorTold = secret
        ? (await deliverToDoctor(
            { action: "cancel", external_booking_id: cancelled.id, reason: parsed.data.reason ?? "" },
            secret,
          )).ok
        : false;
      if (!doctorTold) console.error("The doctor wasn't told about the cancelled booking", cancelled.id);
    }

    return json(doctorTold === undefined ? { order } : { order, doctorTold });
  } catch (error) {
    console.error("Unexpected cancel-order error:", error);
    return json({ error: "Could not cancel this booking. Please try again." }, 500);
  }
});
