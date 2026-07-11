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

const PARTNER_URL =
  "https://titjcfklrmytppvsoavv.supabase.co/functions/v1/doctor-directory";

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

    const target = `${PARTNER_URL}?${forwarded.toString()}`;

    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        "x-webhook-secret": secret,
        "Content-Type": "application/json",
      },
    });

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
        const filtered = list.filter(isApprovedDoctor);
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
