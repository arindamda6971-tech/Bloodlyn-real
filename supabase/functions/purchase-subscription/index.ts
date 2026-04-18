import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Server-side plan pricing (source of truth)
// User plans
const USER_PLAN_PRICES: Record<string, number> = {
  monthly: 29,
  yearly: 299,
};

// Vendor/Partner plans
const VENDOR_PLAN_PRICES: Record<string, number> = {
  "starter_monthly": 29,
  "starter_yearly": 299,
  "growth_monthly": 1999,
  "growth_yearly": 19999,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const bridgeApiKey = Deno.env.get("BRIDGE_API_KEY");

    // Idempotency: clients may send the same key on retries.
    const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key");
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validIdempotencyKey = idempotencyKey && UUID_RE.test(idempotencyKey) ? idempotencyKey : null;

    const body = await req.json();
    const { plan, action, subscriber_type, subscriber_name, vendor_id } = body;

    let userId: string;

    // Check if this is a partner/vendor bridge call
    const authHeader = req.headers.get("Authorization");
    const isBridgeCall = subscriber_type === "vendor" && body.bridge_api_key;

    if (isBridgeCall) {
      // Validate bridge API key for vendor subscriptions
      if (!bridgeApiKey || body.bridge_api_key !== bridgeApiKey) {
        return new Response(JSON.stringify({ error: "Invalid bridge API key" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!vendor_id) {
        return new Response(JSON.stringify({ error: "vendor_id required for vendor subscriptions" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = vendor_id;
    } else {
      // Standard user JWT auth
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.claims.sub;
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const subType = isBridgeCall ? "vendor" : (subscriber_type || "user");

    if (action === "cancel") {
      const { data: activeSub } = await adminClient
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!activeSub) {
        return new Response(JSON.stringify({ error: "No active subscription" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: cancelError } = await adminClient
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", activeSub.id);

      if (cancelError) throw cancelError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Purchase flow
    let price: number;
    let membershipType: string;
    let subscriptionPlan: string;

    if (subType === "vendor") {
      // Vendor plan keys: "starter_monthly", "starter_yearly", "growth_monthly", "growth_yearly"
      if (!plan || !VENDOR_PLAN_PRICES[plan]) {
        return new Response(JSON.stringify({ error: "Invalid vendor plan. Use: starter_monthly, starter_yearly, growth_monthly, growth_yearly" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      price = VENDOR_PLAN_PRICES[plan];
      // Extract membership type from plan key
      membershipType = plan.startsWith("growth") ? "growth_pro" : "starter";
      subscriptionPlan = plan.includes("yearly") ? "yearly" : "monthly";
    } else {
      // User plans
      if (!plan || !USER_PLAN_PRICES[plan]) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      price = USER_PLAN_PRICES[plan];
      membershipType = "gold";
      subscriptionPlan = plan;
    }

    // Cancel any existing active subscriptions for this user
    await adminClient
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");

    // Calculate end date server-side
    const endDate = new Date();
    if (subscriptionPlan === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Insert new subscription
    const { data: newSub, error: insertError } = await adminClient
      .from("subscriptions")
      .insert({
        user_id: userId,
        subscription_plan: subscriptionPlan,
        membership_type: membershipType,
        end_date: endDate.toISOString(),
        status: "active",
        amount_paid: price,
        is_auto_renew: true,
        subscriber_type: subType,
        subscriber_name: subscriber_name || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, subscription: newSub }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("purchase-subscription error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
