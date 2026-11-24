/**
 * Alerts on the patient's phone (a ring when the doctor or the collection partner calls,
 * a missed call, a cancelled consultation, a prescription), sent through Firebase Cloud
 * Messaging. FCM is only the route Android gives apps to reach a closed app: the list of
 * phones (push_devices) and everything else stay in this Supabase project.
 *
 * Nothing here uses Deno, so the app's tests run it. The functions pass in the Firebase
 * service account from the FCM_SERVICE_ACCOUNT secret; without it nothing is sent and
 * the result says so (configured: false).
 *
 * Lock screens show these, so they never name the doctor or a specialty.
 */

/** How long the phone rings for; keep in step with the app's RING_TIMEOUT_MS. */
export const RING_SECONDS = 45;

export type AlertKind =
  | "doctor_call"
  | "doctor_missed"
  | "doctor_cancelled"
  | "prescription_ready"
  | "collection_call"
  | "collection_missed";

/** The app's Android channels: calls ring, call_updates are silent, updates sound once. */
export type AlertChannel = "calls" | "call_updates" | "updates";

export interface Alert {
  kind: AlertKind;
  channel: AlertChannel;
  /** A later alert with the same tag replaces this one: a ring becomes "Missed call". */
  tag: string;
  title: string;
  body: string;
  /** Where a tap opens the app. */
  route: string;
  orderId: string;
  /** How long Firebase may hold it for a phone that's offline. A late ring is no use. */
  ttlSeconds: number;
}

const DAY = 86_400;

export const doctorCallAlert = (orderId: string): Alert => ({
  kind: "doctor_call",
  channel: "calls",
  tag: `call-${orderId}`,
  title: "Your doctor is calling",
  body: "Tap to join your consultation on Google Meet.",
  route: `/appointment/${orderId}`,
  orderId,
  ttlSeconds: RING_SECONDS,
});

export const doctorMissedAlert = (orderId: string): Alert => ({
  kind: "doctor_missed",
  channel: "call_updates",
  tag: `call-${orderId}`,
  title: "Missed call from your doctor",
  body: "Open BloodLyn and keep it open: your doctor may ring again.",
  route: `/appointment/${orderId}`,
  orderId,
  ttlSeconds: 3_600,
});

export const doctorCancelledAlert = (orderId: string): Alert => ({
  kind: "doctor_cancelled",
  channel: "updates",
  tag: `call-${orderId}`,
  title: "Consultation cancelled",
  body: "Your doctor cancelled this consultation. Nothing is charged.",
  route: `/appointment/${orderId}`,
  orderId,
  ttlSeconds: DAY,
});

export const prescriptionAlert = (orderId: string, hasDigitalPrescription = true): Alert => ({
  kind: "prescription_ready",
  channel: "updates",
  tag: `rx-${orderId}`,
  title: "Your prescription is ready",
  body: "Tap to see what your doctor advised.",
  route: hasDigitalPrescription ? `/prescription/${orderId}` : `/appointment/${orderId}`,
  orderId,
  ttlSeconds: 3 * DAY,
});

export const collectionCallAlert = (orderId: string): Alert => ({
  kind: "collection_call",
  channel: "calls",
  tag: `collect-${orderId}`,
  title: "Your collection partner is calling",
  body: "Tap to answer in BloodLyn. Your number stays private.",
  route: `/tracking/${orderId}`,
  orderId,
  ttlSeconds: RING_SECONDS,
});

export const collectionMissedAlert = (orderId: string): Alert => ({
  kind: "collection_missed",
  channel: "call_updates",
  tag: `collect-${orderId}`,
  title: "Missed call from your collection partner",
  body: "Open BloodLyn to call them back.",
  route: `/tracking/${orderId}`,
  orderId,
  ttlSeconds: 3_600,
});

/** The FCM HTTP v1 request body for one phone. */
export function fcmMessage(token: string, alert: Alert) {
  const ring = alert.channel === "calls";
  return {
    message: {
      token,
      // Reaches the app when the alert is tapped, and at once when the app is open.
      data: { type: alert.kind, orderId: alert.orderId, route: alert.route },
      android: {
        priority: ring ? "HIGH" : "NORMAL",
        ttl: `${alert.ttlSeconds}s`,
        notification: {
          channel_id: alert.channel,
          tag: alert.tag,
          title: alert.title,
          body: alert.body,
          icon: "ic_stat_bloodlyn",
          color: "#0474DC",
          visibility: "PUBLIC",
          notification_priority: ring ? "PRIORITY_MAX" : alert.channel === "updates" ? "PRIORITY_DEFAULT" : "PRIORITY_LOW",
          // Android 7 has no channels, so the ringtone is named here too.
          ...(ring ? { sound: "bloodlyn_ring", default_vibrate_timings: true } : {}),
        },
      },
    },
  };
}

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/** The FCM_SERVICE_ACCOUNT secret (the JSON key file Firebase gives), or null when unusable. */
export function parseServiceAccount(raw: string | null | undefined): ServiceAccount | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<Record<keyof ServiceAccount, unknown>>;
    if (typeof j.project_id === "string" && typeof j.client_email === "string" && typeof j.private_key === "string") {
      return { project_id: j.project_id, client_email: j.client_email, private_key: j.private_key };
    }
  } catch {
    /* not JSON */
  }
  return null;
}

const toBase64Url = (bytes: Uint8Array) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const textBase64Url = (text: string) => toBase64Url(new TextEncoder().encode(text));

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** The signed request Google swaps for an access token (RS256 JWT, valid an hour). */
export async function signedAssertion(account: ServiceAccount, now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  const input = `${textBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${textBase64Url(
    JSON.stringify({ iss: account.client_email, scope: FCM_SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }),
  )}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(account.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input)));
  return `${input}.${toBase64Url(signature)}`;
}

let cachedToken: { email: string; token: string; until: number } | null = null;

/** An access token for FCM, kept until a minute before it runs out. */
export async function accessToken(account: ServiceAccount, fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<string> {
  if (cachedToken && cachedToken.email === account.client_email && cachedToken.until - 60_000 > now) return cachedToken.token;
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: await signedAssertion(account, now) }).toString(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google refused the Firebase key (${res.status})`);
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("Google sent no access token");
  cachedToken = { email: account.client_email, token: body.access_token, until: now + Number(body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

/** Forget the cached access token (tests). */
export const resetAccessToken = () => {
  cachedToken = null;
};

export interface PushResult {
  /** The Firebase key is set, so alerts can go out at all. */
  configured: boolean;
  /** Phones this person has signed in on with alerts allowed. */
  devices: number;
  /** Phones Firebase accepted the alert for. */
  sent: number;
}

/** True when Firebase says the phone's token will never work again (app removed, data cleared). */
function tokenIsGone(status: number, body: unknown): boolean {
  if (status === 404) return true;
  const err = (body as { error?: { status?: string; details?: Array<{ errorCode?: string }> } } | null)?.error;
  return !!err?.details?.some((d) => d.errorCode === "UNREGISTERED") || (status === 400 && err?.status === "INVALID_ARGUMENT" && /token/i.test(JSON.stringify(err)));
}

export async function sendAlert({
  account,
  tokens,
  alert,
  fetchImpl = fetch,
  onGoneToken,
}: {
  account: ServiceAccount | null;
  tokens: string[];
  alert: Alert;
  fetchImpl?: typeof fetch;
  onGoneToken?: (token: string) => Promise<unknown> | unknown;
}): Promise<PushResult> {
  const result: PushResult = { configured: !!account, devices: tokens.length, sent: 0 };
  if (!account || tokens.length === 0) return result;
  let bearer: string;
  try {
    bearer = await accessToken(account, fetchImpl);
  } catch (err) {
    console.error("Firebase sign-in failed, no alert sent:", err instanceof Error ? err.message : err);
    return result;
  }
  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`;
  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
          body: JSON.stringify(fcmMessage(token, alert)),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          result.sent++;
          return;
        }
        const body = await res.json().catch(() => null);
        if (tokenIsGone(res.status, body)) await onGoneToken?.(token);
        else console.error(`Alert "${alert.kind}" refused:`, res.status, JSON.stringify(body));
      } catch (err) {
        console.error(`Alert "${alert.kind}" not sent:`, err instanceof Error ? err.message : err);
      }
    }),
  );
  return result;
}

/** The part of a Supabase client this needs (the functions pass their service-role client). */
// deno-lint-ignore no-explicit-any
type Db = { from(table: string): any };

/** Alerts every phone this person is signed in on, dropping phones that are gone. */
export async function alertUser(
  db: Db,
  userId: string | null | undefined,
  alert: Alert,
  account: ServiceAccount | null,
  fetchImpl: typeof fetch = fetch,
): Promise<PushResult> {
  if (!userId) return { configured: !!account, devices: 0, sent: 0 };
  const { data, error } = await db.from("push_devices").select("token").eq("user_id", userId);
  if (error) {
    console.error("Couldn't read the patient's phones:", error.message ?? error);
    return { configured: !!account, devices: 0, sent: 0 };
  }
  const tokens = ((data ?? []) as Array<{ token?: string | null }>).map((d) => d.token).filter((t): t is string => !!t);
  return sendAlert({
    account,
    tokens,
    alert,
    fetchImpl,
    onGoneToken: (token) => db.from("push_devices").delete().eq("token", token),
  });
}

/** Two times from the database or from us name the same moment (formats differ). */
export const sameMoment = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && Date.parse(a) === Date.parse(b);

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
