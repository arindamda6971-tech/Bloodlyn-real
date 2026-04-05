import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRIDGE_BASE_URL = "https://uivexkxdhcubjcdxmjuu.supabase.co/functions/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BRIDGE_API_KEY = Deno.env.get("BRIDGE_API_KEY");
    if (!BRIDGE_API_KEY) {
      return new Response(JSON.stringify({ error: "Bridge API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Parse the request body to get the proxy instructions
    const body = await req.json();
    const { endpoint, method = "GET", params, payload } = body;

    // Validate endpoint whitelist
    const allowedEndpoints = ["bridge-tests", "bridge-tickets", "bridge-tickets/status", "bridge-tickets/details"];
    const baseEndpoint = endpoint?.split("?")[0];
    if (!allowedEndpoints.includes(baseEndpoint)) {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the bridge URL
    let url = `${BRIDGE_BASE_URL}/${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const separator = url.includes("?") ? "&" : "?";
      url += separator + searchParams.toString();
    }

    // Build bridge request options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        "x-bridge-key": BRIDGE_API_KEY,
      },
    };

    if (method.toUpperCase() !== "GET" && payload) {
      // Inject anonymous_id for ticket submissions
      if (baseEndpoint === "bridge-tickets" && method.toUpperCase() === "POST") {
        const last5 = userId.slice(-5);
        payload.anonymous_id = `User#U${last5}`;
        payload.app_type = "user_app";
      }
      fetchOptions.body = JSON.stringify(payload);
    }

    console.log(`Bridge proxy: ${method} ${url}`);

    const bridgeResponse = await fetch(url, fetchOptions);
    const responseData = await bridgeResponse.json();

    return new Response(JSON.stringify(responseData), {
      status: bridgeResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bridge proxy error:", error);
    return new Response(JSON.stringify({ error: "Bridge proxy failed", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
