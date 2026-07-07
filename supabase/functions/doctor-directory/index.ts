// Proxies doctor directory from the BloodLyn Partner Real project.
// Keeps the shared webhook secret server-side (never shipped to browser).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const PARTNER_URL =
  "https://titjcfklrmytppvsoavv.supabase.co/functions/v1/doctor-directory";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("DOCTOR_APPOINTMENT_WEBHOOK_SECRET");
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "Doctor directory not configured", doctors: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const target = PARTNER_URL + (url.search || "");

    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        "x-webhook-secret": secret,
        "Content-Type": "application/json",
      },
    });

    const bodyText = await upstream.text();
    return new Response(bodyText, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    console.error("doctor-directory proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch doctor directory", doctors: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
