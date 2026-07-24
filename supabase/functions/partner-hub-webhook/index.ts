import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    order_number: string;
    user_id: string;
    vendor_id: string | null;
    lab_name: string | null;
    test_name: string | null;
    status: string;
    total: number;
    subtotal: number;
    discount: number;
    scheduled_date: string | null;
    scheduled_time_slot: string | null;
    address_id: string | null;
    payment_method: string | null;
    payment_status: string | null;
    special_instructions: string | null;
    created_at: string;
  };
  schema: string;
  old_record: null | Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate: this endpoint is only called by the DB trigger
  // `notify_partner_hub_on_order` which sends the service role key.
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const expected = `Bearer ${serviceKey}`;
  if (!serviceKey || authHeader.length !== expected.length || authHeader !== expected) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const payload: OrderWebhookPayload = await req.json();
    
    console.log("Partner Hub Webhook received:", JSON.stringify(payload, null, 2));

    // Only process INSERT events
    if (payload.type !== "INSERT") {
      return new Response(
        JSON.stringify({ message: "Ignored non-INSERT event" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = payload.record;

    // Skip if no vendor assigned
    if (!order.vendor_id) {
      console.log("Order has no vendor_id, skipping vendor notification");
      return new Response(
        JSON.stringify({ message: "No vendor assigned to this order" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch vendor's diagnostic center details
    const { data: vendorCenter, error: centerError } = await adminClient
      .from("diagnostic_centers")
      .select("id, name, email, phone")
      .eq("vendor_id", order.vendor_id)
      .single();

    if (centerError) {
      console.error("Error fetching vendor center:", centerError);
    }

    // Fetch address details if available
    let addressDetails = null;
    if (order.address_id) {
      const { data: address } = await adminClient
        .from("addresses")
        .select("address_line1, address_line2, city, state, pincode")
        .eq("id", order.address_id)
        .single();
      addressDetails = address;
    }

    // Parse structured patient fields out of special_instructions so the
    // Partner project can display the *selected family member* (not the
    // account holder's profile name). Format produced by create-order:
    //   "Patient: <Name> (Age: <n>, Gender: <g>, Phone: <p>) | Prescription: <url>"
    let patient: {
      name: string | null;
      age: string | null;
      gender: string | null;
      phone: string | null;
    } | null = null;
    let prescription_url: string | null = null;
    if (order.special_instructions) {
      const patientMatch = order.special_instructions.match(
        /Patient:\s*([^()|]+?)\s*\(([^)]*)\)/i,
      );
      if (patientMatch) {
        const name = patientMatch[1].trim();
        const meta = patientMatch[2];
        const ageM = meta.match(/Age:\s*([^,]+?)\s*(?:,|$)/i);
        const genderM = meta.match(/Gender:\s*([^,]+?)\s*(?:,|$)/i);
        const phoneM = meta.match(/Phone:\s*([^,]+?)\s*(?:,|$)/i);
        patient = {
          name,
          age: ageM ? ageM[1].trim() : null,
          gender: genderM ? genderM[1].trim() : null,
          phone: phoneM ? phoneM[1].trim() : null,
        };
      }
      const presM = order.special_instructions.match(/Prescription:\s*(\S+)/i);
      if (presM) prescription_url = presM[1];
    }

    // Prepare the notification payload for the vendor
    const vendorNotification = {
      order_id: order.id,
      order_number: order.order_number,
      vendor_id: order.vendor_id,
      diagnostic_center: vendorCenter ? {
        id: vendorCenter.id,
        name: vendorCenter.name,
        email: vendorCenter.email,
        phone: vendorCenter.phone,
      } : null,
      // Top-level patient block — Partner project should display these
      // fields instead of looking up the buyer's profile name.
      patient,
      prescription_url,
      order_details: {
        lab_name: order.lab_name,
        test_name: order.test_name,
        total: order.total,
        subtotal: order.subtotal,
        discount: order.discount,
        scheduled_date: order.scheduled_date,
        scheduled_time_slot: order.scheduled_time_slot,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        special_instructions: order.special_instructions,
        // Duplicate inside order_details too for partner UIs that read here
        patient_name: patient?.name ?? null,
        patient_age: patient?.age ?? null,
        patient_gender: patient?.gender ?? null,
        patient_phone: patient?.phone ?? null,
      },
      customer_address: addressDetails,
      created_at: order.created_at,
    };

    console.log("Vendor notification prepared:", JSON.stringify(vendorNotification, null, 2));

    // Forward to external partner-order-receiver (marketplace project)
    const receiverUrl =
      Deno.env.get("PARTNER_ORDER_RECEIVER_URL") ||
      "https://titjcfklrmytppvsoavv.supabase.co/functions/v1/partner-order-receiver";
    const webhookSecret = Deno.env.get("PARTNER_WEBHOOK_SECRET");

    let forwardResult: { status: number; body: string } | { error: string } | null = null;
    if (!webhookSecret) {
      console.error("PARTNER_WEBHOOK_SECRET not configured — skipping external forward");
      forwardResult = { error: "missing PARTNER_WEBHOOK_SECRET" };
    } else {
      try {
        const forwardPayload = {
          ...vendorNotification,
          vendor_id: order.vendor_id,
          record: order,
        };
        const resp = await fetch(receiverUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": webhookSecret,
          },
          body: JSON.stringify(forwardPayload),
        });
        const text = await resp.text();
        forwardResult = { status: resp.status, body: text.slice(0, 500) };
        console.log("Forwarded to partner-order-receiver:", resp.status, text.slice(0, 200));
      } catch (e) {
        console.error("Forward to partner-order-receiver failed:", e);
        forwardResult = { error: String(e) };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Vendor notified of new order",
        notification: vendorNotification,
        forward: forwardResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Partner Hub Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
