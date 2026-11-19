/**
 * Home-collection links: the temporary page a lab sends its collection partner on
 * WhatsApp, with a "Call patient" button that rings the patient's BloodLyn app.
 *
 * KEEP IDENTICAL in partner-pro (supabase/functions/_shared/collection-link.ts) and
 * Bloodlyn-real (supabase/functions/_shared/collection-link.ts): the Partner Portal
 * creates links, writes the WhatsApp message and serves the page (/c/<token>); the
 * BloodLyn project keeps the links and runs the call (collection-call).
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
  /** The patient's GPS pin of the address, when they shared one at checkout. */
  latitude?: number | null;
  longitude?: number | null;
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

/** A real map point from loose input (numbers or numeric strings), else null. 0,0 is "unknown". */
export function exactPoint(lat: unknown, lon: unknown): { latitude: number; longitude: number } | null {
  if (lat == null || lon == null || lat === "" || lon === "") return null;
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  // Six decimals is about 10 cm; more is noise.
  return { latitude: Math.round(latitude * 1e6) / 1e6, longitude: Math.round(longitude * 1e6) / 1e6 };
}

/**
 * Google Maps link for a collection: the patient's exact pin when they shared one,
 * else a search for the address text (which can land on the PIN area). "" when neither.
 */
export function mapUrl(address: string | null | undefined, latitude?: unknown, longitude?: unknown): string {
  const point = exactPoint(latitude, longitude);
  if (point) return `https://maps.google.com/?q=${point.latitude},${point.longitude}`;
  const text = typeof address === "string" ? address.trim() : "";
  return text ? `https://maps.google.com/?q=${encodeURIComponent(text)}` : "";
}

/** Only the fields the page needs, trimmed to sane lengths; anything else is dropped. */
export function cleanCollectionDetails(raw: unknown): CollectionDetails {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const date = text(r.date, 10);
  const phone = text(r.lab_phone, 20).replace(/\D/g, "").slice(-10);
  const point = exactPoint(r.latitude, r.longitude);
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
    latitude: point?.latitude ?? null,
    longitude: point?.longitude ?? null,
    order_number: text(r.order_number, 40),
    lab_name: text(r.lab_name, 120),
    lab_phone: /^[6-9]\d{9}$/.test(phone) ? phone : "",
    partner_name: text(r.partner_name, 80),
  };
}

const TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * A link secret: 24 letters and digits (about 142 random bits), impossible to guess.
 * Letters and digits only, because WhatsApp leaves a trailing "-" or "_" out of a link.
 */
export function newLinkToken(): string {
  let out = "";
  const bytes = new Uint8Array(32);
  while (out.length < 24) {
    crypto.getRandomValues(bytes);
    // 248 = 4 × 62: dropping higher bytes keeps every character equally likely.
    for (const b of bytes) if (b < 248 && out.length < 24) out += TOKEN_CHARS[b % 62];
  }
  return out;
}

export const isLinkToken = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{20,40}$/.test(v);

/**
 * Where the partner's page opens: the public https address the lab is using the Partner
 * Portal from (the published site, later its own domain), so links follow the portal
 * wherever it's hosted. Lovable's private preview addresses can't be opened by a partner,
 * so they — and anything that isn't https — fall back to the COLLECTION_PAGE_URL setting
 * (which may be http://localhost:<port> for testing on one computer). "" = no link.
 */
export function collectionPageBase(origin: string | null | undefined, setting: string | null | undefined): string {
  const o = String(origin ?? "").trim().replace(/\/+$/, "");
  const publicHost = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d{2,5})?$/i.test(o);
  const privatePreview = /lovableproject\.com(:\d+)?$/i.test(o) || /^https:\/\/(id-)?preview--/i.test(o);
  if (publicHost && !privatePreview) return o;
  const s = String(setting ?? "").trim().replace(/\/+$/, "");
  if (/^https:\/\/[^/\s]+$/i.test(s) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/i.test(s)) return s;
  return "";
}

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
 * is never in it. Without a link (the Partner Portal isn't online yet) the details
 * still go, and the partner asks the lab to reach the patient.
 */
export function collectionMessage(d: CollectionDetails, url: string | null): string {
  const when = [prettyDay(d.date), d.slot].filter(Boolean).join(", ");
  const map = mapUrl(d.address, d.latitude, d.longitude);
  return [
    `*Home collection${d.lab_name ? ` - ${d.lab_name}` : ""}*`,
    d.order_number ? `Order: ${d.order_number}` : null,
    when ? `When: ${when}` : null,
    d.patient_name ? `Patient: ${[d.patient_name, d.patient_meta].filter(Boolean).join(", ")}` : null,
    d.tests.length ? `Tests: ${d.tests.join(", ")}` : null,
    d.address ? `Address: ${d.address}` : null,
    map ? `${exactPoint(d.latitude, d.longitude) ? "Exact location" : "Map"}: ${map}` : null,
    "",
    url ? "*Call the patient from here* (their number stays private):" : "To reach the patient, please call the lab.",
    url,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}
