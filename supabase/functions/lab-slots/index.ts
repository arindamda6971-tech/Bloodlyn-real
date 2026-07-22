// Edge function: fetch lab_time_slots rows from the Partner Supabase project.
// Public read (no auth required); caller passes ?lab_user_id=<uuid>.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

// Partner Real project (BloodLyn Partner Real)
const PARTNER_URL = "https://titjcfklrmytppvsoavv.supabase.co";
// Publishable anon key — safe to embed (same kind as the one in .env)
const PARTNER_ANON_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdGpjZmtscm15dHBwdnNvYXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzMzNTIsImV4cCI6MjA4NzA0OTM1Mn0.tyKSMCLjnAVB8WCvKiHF7JrBkOEmBHoLkrrmXFVfunU";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Always use the BloodLyn Partner Real publishable key (safe to embed).
    // Ignore PARTNER_SUPABASE_ANON_KEY env var — stale value pointed at wrong project.
    const ANON = PARTNER_ANON_FALLBACK;

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
      `?select=day_of_week,is_open,slots&lab_user_id=eq.${labUserId}&order=day_of_week.asc`;

    const res = await fetch(url, {
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Partner PostgREST error:", res.status, data);
    }

    const defaultSlots = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM"];
    const rows = Array.isArray(data) && data.length > 0
      ? data
      : Array.from({ length: 7 }, (_, i) => ({
          day_of_week: i,
          is_open: true,
          slots: defaultSlots,
        }));

    return new Response(JSON.stringify({ rows }), {
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
