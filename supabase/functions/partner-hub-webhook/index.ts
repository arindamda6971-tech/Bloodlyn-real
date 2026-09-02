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
    let addressDetails: {
      address_line1?: string | null;
      address_line2?: string | null;
      city?: string | null;
      state?: string | null;
      pincode?: string | null;
      phone?: string | null;
    } | null = null;
    let formattedAddress: string | null = null;
    let addressPincode: string | null = null;
    if (order.address_id) {
      const { data: address } = await adminClient
        .from("addresses")
        .select("address_line1, address_line2, city, state, pincode, phone")
        .eq("id", order.address_id)
        .maybeSingle();
      addressDetails = address ?? null;
      if (address) {
        // De-duplicate repeated fragments (address_line2 often already
        // contains city/state/pincode from the geocoder).
        const parts = [
          address.address_line1,
          address.address_line2,
          address.city,
          address.state,
          address.pincode,
        ]
          .map((p) => (p ? String(p).trim() : ""))
          .filter(Boolean);
        const seen = new Set<string>();
        const unique: string[] = [];
        for (const p of parts) {
          const key = p.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(p);
        }
        formattedAddress = unique.join(", ") || null;
        addressPincode = address.pincode ? String(address.pincode) : null;
      }
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

    // Classify the order so the Partner project routes it to the right queue.
    // A "bp_check" order is ONLY one where EVERY line item is a BP check.
    // If a BP check rides along with real lab tests, it is a normal lab order
    // (with a BP add-on) and must land on the blood-test booking page.
    //
    // Line items come from create-order as structured objects. Legacy/trigger
    // callers only have the aggregated `test_name`, which we split on "|"
    // (new format) or "," (legacy format).
    const providedLineItems = Array.isArray((payload as any).line_items)
      ? ((payload as any).line_items as Array<{ name?: string; price?: number; quantity?: number }>)
      : null;

    const splitNames = (raw: string): string[] => {
      const value = (raw || "").trim();
      if (!value) return [];
      const delimiter = value.includes("|") ? "|" : ",";
      return value.split(delimiter).map((s) => s.trim()).filter(Boolean);
    };

    const lineItems: Array<{ name: string; price: number | null; quantity: number }> =
      providedLineItems && providedLineItems.length > 0
        ? providedLineItems.map((i) => ({
            name: String(i.name || "Diagnostic Test").trim(),
            price: typeof i.price === "number" ? i.price : null,
            quantity: typeof i.quantity === "number" && i.quantity > 0 ? i.quantity : 1,
          }))
        : splitNames(order.test_name || "").map((name) => ({ name, price: null, quantity: 1 }));

    const lineItemNames = lineItems.map((i) => i.name);
    const BP_RE = /(home\s*bp|bp\s*check|blood\s*pressure)/i;
    const bpItems = lineItemNames.filter((n) => BP_RE.test(n));
    const testItems = lineItemNames.filter((n) => !BP_RE.test(n));
    const hasBpAddon = bpItems.length > 0 && testItems.length > 0;
    const orderType: "bp_check" | "lab_test" =
      bpItems.length > 0 && testItems.length === 0 ? "bp_check" : "lab_test";


    // Prepare the notification payload for the vendor
    const vendorNotification = {
      order_id: order.id,
      order_number: order.order_number,
      vendor_id: order.vendor_id,
      // Routing hints for the Partner hub UI.
      order_type: orderType,
      has_bp_addon: orderType === "lab_test" ? hasBpAddon : false,
      bp_addon_items: orderType === "lab_test" && hasBpAddon ? bpItems : [],
      test_items: orderType === "bp_check" ? [] : testItems,
      // Backward compat: full raw line-item list
      items: lineItems,
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
        order_type: orderType,
        has_bp_addon: orderType === "lab_test" ? hasBpAddon : false,
        bp_addon_items: orderType === "lab_test" && hasBpAddon ? bpItems : [],
        test_items: orderType === "bp_check" ? [] : testItems,
        items: lineItems,


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
        // Collection address (string) for partner UIs reading order_details
        customer_address: formattedAddress,
        delivery_address: formattedAddress,
        address_pincode: addressPincode,
      },
      // Collection / delivery address — string form first (what the partner
      // booking tile renders), structured form kept alongside.
      customer_address: formattedAddress,
      delivery_address: formattedAddress,
      address_line1: addressDetails?.address_line1 ?? null,
      address_line2: addressDetails?.address_line2 ?? null,
      city: addressDetails?.city ?? null,
      state: addressDetails?.state ?? null,
      pincode: addressPincode,
      address_phone: addressDetails?.phone ?? null,
      customer_address_details: addressDetails,
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
