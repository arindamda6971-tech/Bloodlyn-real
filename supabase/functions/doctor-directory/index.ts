// Proxies doctor directory from the BloodLyn Partner Real project.
// Keeps the shared webhook secret server-side (never shipped to browser).
//
// Defensive filter: even if upstream returns extra rows, we only expose
// doctors that are explicitly approved + active + vendor_type === 'doctor'.
// Source of truth is still vendor_verifications in the Partner project.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PARTNER_URL =
  "https://wkhwuzsiehrcvlxfeytf.supabase.co/functions/v1/doctor-directory";

type Rating = { rating: number; reviews: number };

/** India's date today, YYYY-MM-DD: doctor bookings are for the day they're made. */
const indiaToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/**
 * Today's open bookings for each doctor who has a daily limit, so the list can say
 * "Fully booked today". create-order applies the same count when booking.
 */
// deno-lint-ignore no-explicit-any
async function bookedToday(doctors: any[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const ids = doctors
    .filter((d) => Number(d.dailyLimit) > 0)
    .map((d) => String(d.id ?? d.user_id ?? d.doctor_id));
  if (ids.length === 0) return counts;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return counts;
    const { data, error } = await createClient(url, key)
      .from("orders")
      .select("vendor_id")
      .in("vendor_id", ids)
      .eq("scheduled_date", indiaToday())
      .neq("status", "cancelled");
    if (error) throw error;
    for (const row of (data ?? []) as { vendor_id: string }[]) {
      counts.set(String(row.vendor_id), (counts.get(String(row.vendor_id)) ?? 0) + 1);
    }
  } catch (err) {
    console.warn("Today's doctor bookings unavailable (no one is shown as full):", err);
  }
  return counts;
}

// Patients' ratings of finished consultations live in this project (on their orders).
// A doctor nobody has rated yet shows no rating; the list never makes one up.
async function consultRatings(): Promise<Map<string, Rating>> {
  const ratings = new Map<string, Rating>();
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return ratings;
    const { data, error } = await createClient(url, key).rpc("doctor_consult_ratings");
    if (error) throw error;
    for (const row of (data ?? []) as { doctor_id: string; rating: number; reviews: number }[]) {
      ratings.set(String(row.doctor_id), { rating: Number(row.rating) || 0, reviews: Number(row.reviews) || 0 });
    }
  } catch (err) {
    console.warn("Doctor ratings unavailable (the list is shown without them):", err);
  }
  return ratings;
}

// Only surface doctors that the partner project has explicitly approved.
function isApprovedDoctor(d: any): boolean {
  if (!d || typeof d !== "object") return false;

  const status = String(
    d.verification_status ?? d.status ?? d.vendor_status ?? "",
  ).toLowerCase();
  const vendorType = String(
    d.vendor_type ?? d.type ?? "doctor",
  ).toLowerCase();

  const isActive =
    d.is_active === true ||
    d.active === true ||
    d.available === true ||
    // If upstream doesn't send an activity flag at all, don't reject on that alone.
    (d.is_active === undefined && d.active === undefined && d.available === undefined);

  const isApproved = status === "approved" || status === "verified" || status === "";
  // status === "" only passes when upstream omits the field entirely (already-filtered payload)

  const isDoctor = vendorType === "doctor" || vendorType === "";

  // Hard rejects: anything explicitly pending / rejected / suspended / inactive
  if (["pending", "rejected", "suspended", "blocked", "disabled"].includes(status)) {
    return false;
  }

  return isApproved && isActive && isDoctor;
}

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
    // Force the strict filter upstream too, so the partner endpoint can honor it.
    const forwarded = new URLSearchParams(url.search);
    forwarded.set("status", "approved");
    forwarded.set("is_active", "true");
    forwarded.set("vendor_type", "doctor");

    // Admin "Force-refresh directory" sends `x-cache-bust: 1` — forward it and
    // append a nonce so any intermediary/CDN cache is bypassed end-to-end.
    const cacheBust =
      req.headers.get("x-cache-bust") || req.headers.get("X-Cache-Bust");
    if (cacheBust) {
      forwarded.set("_cb", `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    }

    const target = `${PARTNER_URL}?${forwarded.toString()}`;

    const [upstream, ratings] = await Promise.all([
      fetch(target, {
        method: "GET",
        headers: {
          "x-webhook-secret": secret,
          "Content-Type": "application/json",
          ...(cacheBust ? { "x-cache-bust": String(cacheBust), "Cache-Control": "no-cache" } : {}),
        },
      }),
      consultRatings(),
    ]);

    const bodyText = await upstream.text();

    // Defensive re-filter on our side so a rejected/suspended doctor can never
    // reach a patient client, even if the partner endpoint regresses.
    try {
      const parsed = JSON.parse(bodyText);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.doctors)
          ? parsed.doctors
          : null;

      if (list) {
        const approved = list.filter(isApprovedDoctor);
        const booked = await bookedToday(approved);
        const filtered = approved.map((d: any) => {
          const id = String(d.id ?? d.user_id ?? d.doctor_id);
          const rated = ratings.get(id);
          const limit = Number(d.dailyLimit);
          const fullToday = Number.isInteger(limit) && limit > 0 && (booked.get(id) ?? 0) >= limit;
          return { ...d, ...(rated ? { rating: rated.rating, reviews: rated.reviews } : {}), fullToday };
        });
        const payload = Array.isArray(parsed) ? filtered : { ...parsed, doctors: filtered };
        return new Response(JSON.stringify(payload), {
          status: upstream.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      // fall through to raw passthrough if body isn't JSON
    }

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
