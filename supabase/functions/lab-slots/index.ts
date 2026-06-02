// Edge function: fetch lab_time_slots rows from the Partner Supabase project.
// Public read (no auth required); caller passes ?lab_user_id=<uuid>.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PARTNER_URL = "https://uivexkxdhcubjcdxmjuu.supabase.co";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANON = Deno.env.get("PARTNER_SUPABASE_ANON_KEY");
    if (!ANON) {
      return new Response(JSON.stringify({ error: "PARTNER_SUPABASE_ANON_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let labUserId: string | null = null;
    if (req.method === "GET") {
      labUserId = new URL(req.url).searchParams.get("lab_user_id");
    } else {
      const body = await req.json().catch(() => ({}));
      labUserId = body?.lab_user_id ?? null;
    }

    if (!labUserId || !/^[0-9a-f-]{36}$/i.test(labUserId)) {
      return new Response(JSON.stringify({ error: "Invalid lab_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url =
      `${PARTNER_URL}/rest/v1/lab_time_slots` +
      `?select=day_of_week,is_open,slots&lab_user_id=eq.${labUserId}`;

    const res = await fetch(url, {
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Partner PostgREST error:", res.status, data);
      return new Response(JSON.stringify({ error: "Partner fetch failed", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ rows: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lab-slots error:", e);
    return new Response(JSON.stringify({ error: "Unhandled error", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
