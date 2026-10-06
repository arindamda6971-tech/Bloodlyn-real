import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COLLECTION_SLOTS, normalizeCollectionSlot, parseSlotCapacities } from "../_shared/slot-capacity.ts";

// Edge function: fetch lab_time_slots rows from the Partner Supabase project.
// Public read (no auth required); caller passes ?lab_user_id=<uuid>.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

// Partner Real project (BloodLyn Partner Real)
const PARTNER_URL = "https://wkhwuzsiehrcvlxfeytf.supabase.co";
// Publishable anon key — safe to embed (same kind as the one in .env)
const PARTNER_ANON_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraHd1enNpZWhyY3ZseGZleXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzE2MTYsImV4cCI6MjEwMTk0NzYxNn0.fFrH7uJ_fCn0hkAlQdf3yLNW5x9LOTE2yAg8jhWyPxM";

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
      `?select=day_of_week,is_open,slots,slot_capacities&lab_user_id=eq.${labUserId}&order=day_of_week.asc`;

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

    // No fabricated fallback: the customer app must show the lab's real
    // Partner-dashboard schedule. An empty list means "no schedule published".
    const rows = Array.isArray(data) ? data : [];

    // Availability is date-specific: Partner owns capacity, while this project
    // owns the authoritative bookings that consume it.
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    });
    const dates = Array.from({ length: 3 }, (_, offset) => {
      const target = new Date(now.getTime() + offset * 86_400_000);
      return dateFormatter.format(target);
    });
    const localUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const bookedByDateSlot: Record<string, number> = {};
    if (localUrl && serviceKey) {
      const admin = createClient(localUrl, serviceKey);
      const { data: bookedOrders, error: bookedError } = await admin
        .from("orders")
        .select("scheduled_date,scheduled_time_slot,status")
        .eq("vendor_id", labUserId)
        .in("scheduled_date", dates);
      if (bookedError) throw bookedError;
      for (const order of bookedOrders ?? []) {
        if (String(order.status ?? "").toLowerCase() === "cancelled") continue;
        const slot = normalizeCollectionSlot(order.scheduled_time_slot);
        if (!slot || !order.scheduled_date) continue;
        const key = `${String(order.scheduled_date).slice(0, 10)}|${slot.id}`;
        bookedByDateSlot[key] = (bookedByDateSlot[key] ?? 0) + 1;
      }
    }

    const availabilityByDate = Object.fromEntries(dates.map((date) => {
      const weekday = new Date(`${date}T12:00:00+05:30`).getUTCDay();
      const row = rows.find((candidate: Record<string, unknown>) => candidate.day_of_week === weekday);
      const capacities = parseSlotCapacities(row?.slot_capacities);
      return [date, Object.fromEntries(COLLECTION_SLOTS.map((slot) => {
        const capacity = capacities[slot.id];
        const booked = bookedByDateSlot[`${date}|${slot.id}`] ?? 0;
        return [slot.id, {
          capacity,
          booked,
          remaining: capacity === null ? null : Math.max(0, capacity - booked),
        }];
      }))];
    }));

    return new Response(JSON.stringify({ rows, availability_by_date: availabilityByDate, source: "partner" }), {
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
