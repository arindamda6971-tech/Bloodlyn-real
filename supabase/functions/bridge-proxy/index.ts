import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRIDGE_BASE_URL = "https://uivexkxdhcubjcdxmjuu.supabase.co/functions/v1";

// ----------------------------------------------------------------------------
// In-memory token-bucket rate limiter: 30 requests / 60 seconds per user_id.
// Note: per edge-function instance — multiple instances => limit is per-instance.
// ----------------------------------------------------------------------------
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitCheck(userId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(userId);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

// Periodic cleanup to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, RATE_LIMIT_WINDOW_MS);

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

    // Parse and validate proxy instructions before authentication so public
    // catalog reads can also work with Supabase's non-JWT publishable keys.
    const body = await req.json();
    const { endpoint, method = "GET", params, payload } = body;
    const normalizedMethod = typeof method === "string" ? method.toUpperCase() : "GET";
    const allowedEndpoints = ["bridge-tests", "bridge-tickets", "bridge-tickets/status", "bridge-tickets/details", "bridge-settings"];
    const baseEndpoint = typeof endpoint === "string" ? endpoint.split("?")[0] : "";
    if (!allowedEndpoints.includes(baseEndpoint)) {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PUBLIC_READ_ENDPOINTS = ["bridge-tests", "bridge-settings"];
    const isPublicRead = PUBLIC_READ_ENDPOINTS.includes(baseEndpoint) && normalizedMethod === "GET";
    const authHeader = req.headers.get("Authorization");
    let userId: string | undefined;

    // Public reads need no user identity. Protected bridge operations require
    // a real Supabase user access token, verified by Auth rather than decoded
    // locally. An anon/publishable API key can therefore never create tickets.
    if (!isPublicRead) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.slice("Bearer ".length).trim();
      const userSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const { data: authData, error: authError } = await userSupabase.auth.getUser(token);
      userId = authData.user?.id;

      if (authError || !userId) {
        return new Response(JSON.stringify({ error: "Unauthorized: invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Per-user rate limit (after auth so anon traffic can't exhaust the table)
    const rl = rateLimitCheck(userId ?? "anon");
    if (!rl.ok) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again shortly.", retryAfter: rl.retryAfter }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rl.retryAfter),
          },
        },
      );
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
      method: normalizedMethod,
      headers: {
        "Content-Type": "application/json",
        "x-bridge-key": BRIDGE_API_KEY,
      },
    };

    if (normalizedMethod !== "GET" && payload) {
      // Inject anonymous_id for ticket submissions
      if (baseEndpoint === "bridge-tickets" && normalizedMethod === "POST" && userId) {
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
