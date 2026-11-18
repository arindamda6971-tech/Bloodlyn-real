/**
 * Home-collection links: the temporary page a lab sends its collection partner on
 * WhatsApp, with a "Call patient" button that rings the patient's BloodLyn app.
 *
 * KEEP IDENTICAL in partner-pro (supabase/functions/_shared/collection-link.ts) and
 * Bloodlyn-real (supabase/functions/_shared/collection-link.ts): the Partner Portal
 * creates links and writes the WhatsApp message, the BloodLyn app serves the page.
 */

/** What the page and the WhatsApp message show. No patient phone number, ever. */
export interface CollectionDetails {
  patient_name: string;
  /** "43 yrs · Female" */
  patient_meta: string;
  /** YYYY-MM-DD, the collection day. */
  date: string;
  /** "08:00 AM - 10:00 AM" */
  slot: string;
  tests: string[];
  address: string;
  order_number: string;
  lab_name: string;
  /** The lab's own number, so the partner can ask the lab if the patient doesn't answer. */
  lab_phone: string;
  partner_name: string;
}

const text = (v: unknown, max: number) =>
  typeof v === "string" || typeof v === "number"
    ? String(v).replace(/\s+/g, " ").trim().slice(0, max)
    : "";

/** Only the fields the page needs, trimmed to sane lengths; anything else is dropped. */
export function cleanCollectionDetails(raw: unknown): CollectionDetails {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const date = text(r.date, 10);
  const phone = text(r.lab_phone, 20).replace(/\D/g, "").slice(-10);
  return {
    patient_name: text(r.patient_name, 80),
    patient_meta: text(r.patient_meta, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    slot: text(r.slot, 60),
    tests: (Array.isArray(r.tests) ? r.tests : [])
      .map((t) => text(t, 120))
      .filter(Boolean)
      .slice(0, 15),
    address: text(r.address, 400),
    order_number: text(r.order_number, 40),
    lab_name: text(r.lab_name, 120),
    lab_phone: /^[6-9]\d{9}$/.test(phone) ? phone : "",
    partner_name: text(r.partner_name, 80),
  };
}

/** A link secret: 24 URL-safe characters (144 random bits), impossible to guess. */
export function newLinkToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const isLinkToken = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{20,40}$/.test(v);

const HOUR = 3_600_000;

/**
 * When a link stops working: the end of the day after the collection day (India
 * time), but never sooner than 12 hours or later than 7 days from now.
 */
export function linkExpiry(collectionDate: string, now = new Date()): Date {
  const min = now.getTime() + 12 * HOUR;
  const max = now.getTime() + 7 * 24 * HOUR;
  let end = min;
  if (/^\d{4}-\d{2}-\d{2}$/.test(collectionDate)) {
    // 23:59 India time on the day after = 18:29 UTC that day.
    const day = Date.parse(`${collectionDate}T18:29:59Z`);
    if (!Number.isNaN(day)) end = day + 24 * HOUR;
  }
  return new Date(Math.min(max, Math.max(min, end)));
}

/** Once the sample is in (or the booking is over), the link has done its job. */
export const CLOSED_ORDER_STATUSES = ["sample_collected", "processing", "report_ready", "report_uploaded", "completed", "cancelled"];

export type LinkState = "active" | "expired" | "revoked" | "closed";

export function linkState(
  link: { expires_at: string; revoked_at: string | null },
  order: { status: string | null; is_escalated?: boolean | null } | null,
  now = new Date(),
): LinkState {
  if (link.revoked_at) return "revoked";
  if (!order || order.is_escalated || CLOSED_ORDER_STATUSES.includes(String(order.status ?? "").toLowerCase())) return "closed";
  if (Date.parse(link.expires_at) <= now.getTime()) return "expired";
  return "active";
}

/** "Wed, 19 Nov" from YYYY-MM-DD, or "" */
export function prettyDay(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

/**
 * The WhatsApp message the lab sends its collection partner: the essentials at a
 * glance, then the link for the full page and the call. The patient's phone number
 * is never in it.
 */
export function collectionMessage(d: CollectionDetails, url: string): string {
  const when = [prettyDay(d.date), d.slot].filter(Boolean).join(", ");
  const map = d.address ? `https://maps.google.com/?q=${encodeURIComponent(d.address)}` : "";
  return [
    `*Home collection${d.lab_name ? ` - ${d.lab_name}` : ""}*`,
    d.order_number ? `Order: ${d.order_number}` : null,
    when ? `When: ${when}` : null,
    d.patient_name ? `Patient: ${[d.patient_name, d.patient_meta].filter(Boolean).join(", ")}` : null,
    d.tests.length ? `Tests: ${d.tests.join(", ")}` : null,
    d.address ? `Address: ${d.address}` : null,
    map ? `Map: ${map}` : null,
    "",
    "*Call the patient from here* (their number stays private):",
    url,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
