import { describe, it, expect, vi, beforeEach } from "vitest";
import { webcrypto } from "node:crypto";

// The functions run on Deno, which has Web Crypto; the test page may not.
if (!globalThis.crypto?.subtle) vi.stubGlobal("crypto", webcrypto);
import {
  RING_SECONDS,
  alertUser,
  collectionCallAlert,
  collectionMissedAlert,
  doctorCallAlert,
  doctorCancelledAlert,
  doctorMissedAlert,
  fcmMessage,
  parseServiceAccount,
  prescriptionAlert,
  resetAccessToken,
  sameMoment,
  sendAlert,
  signedAssertion,
  type ServiceAccount,
} from "../../supabase/functions/_shared/push-alerts";

const ORDER = "0b6f6d2e-1c2a-4f6e-9a51-7a3c1f0e9d11";

async function testAccount(): Promise<{ account: ServiceAccount; publicKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const b64 = Buffer.from(der).toString("base64").replace(/(.{64})/g, "$1\n");
  return {
    // As the key file has it: escaped newlines inside the JSON string.
    account: { project_id: "bloodlyn-test", client_email: "push@bloodlyn-test.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\\n${b64}\\n-----END PRIVATE KEY-----\\n` },
    publicKey: pair.publicKey,
  };
}

const decode = (part: string) => JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));

describe("call alerts: what the phone shows", () => {
  it("rings for a doctor's call, for no longer than the ring, without naming the doctor", () => {
    const ring = doctorCallAlert(ORDER);
    expect(ring).toMatchObject({ kind: "doctor_call", channel: "calls", tag: `call-${ORDER}`, route: `/appointment/${ORDER}`, ttlSeconds: RING_SECONDS });
    expect(`${ring.title} ${ring.body}`).not.toMatch(/Dr\b|psychiatr|sexolog|gyn/i);

    const msg = fcmMessage("phone-token", ring).message;
    expect(msg.token).toBe("phone-token");
    expect(msg.data).toEqual({ type: "doctor_call", orderId: ORDER, route: `/appointment/${ORDER}` });
    expect(msg.android).toMatchObject({ priority: "HIGH", ttl: "45s" });
    expect(msg.android.notification).toMatchObject({ channel_id: "calls", tag: `call-${ORDER}`, sound: "bloodlyn_ring", notification_priority: "PRIORITY_MAX" });
  });

  it("turns an unanswered ring into a quiet missed call in the same place", () => {
    const missed = fcmMessage("t", doctorMissedAlert(ORDER)).message.android;
    expect(missed.notification.tag).toBe(`call-${ORDER}`);
    expect(missed.notification.channel_id).toBe("call_updates");
    expect(missed.notification).not.toHaveProperty("sound");
    expect(missed.priority).toBe("NORMAL");
    expect(doctorCancelledAlert(ORDER).tag).toBe(`call-${ORDER}`);
    expect(collectionMissedAlert(ORDER).tag).toBe(collectionCallAlert(ORDER).tag);
  });

  it("opens the prescription, or the appointment when only a file was sent", () => {
    expect(prescriptionAlert(ORDER).route).toBe(`/prescription/${ORDER}`);
    expect(prescriptionAlert(ORDER, false).route).toBe(`/appointment/${ORDER}`);
    expect(collectionCallAlert(ORDER).route).toBe(`/tracking/${ORDER}`);
  });

  it("compares the ring's time whatever way the database writes it", () => {
    expect(sameMoment("2026-11-24T10:00:00.123Z", "2026-11-24T10:00:00.123+00:00")).toBe(true);
    expect(sameMoment("2026-11-24T10:00:00.123Z", "2026-11-24T10:00:01.123Z")).toBe(false);
    expect(sameMoment(null, "2026-11-24T10:00:00Z")).toBe(false);
  });
});

describe("call alerts: sending through Firebase", () => {
  beforeEach(() => resetAccessToken());

  it("reads the Firebase key file and refuses anything else", () => {
    expect(parseServiceAccount(JSON.stringify({ project_id: "p", client_email: "e", private_key: "k", other: 1 }))).toEqual({ project_id: "p", client_email: "e", private_key: "k" });
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount("not json")).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ project_id: "p" }))).toBeNull();
  });

  it("signs in to Google with a correctly signed request", async () => {
    const { account, publicKey } = await testAccount();
    const jwt = await signedAssertion(account, Date.UTC(2026, 10, 24, 10, 0, 0));
    const [header, claims, signature] = jwt.split(".");
    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decode(claims)).toMatchObject({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: decode(claims).iat + 3600,
    });
    const sig = Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, sig, new TextEncoder().encode(`${header}.${claims}`));
    expect(ok).toBe(true);
  });

  it("sends to each phone, and drops a phone Firebase says is gone", async () => {
    const { account } = await testAccount();
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.startsWith("https://oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "ya29.test", expires_in: 3600 }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body));
      expect(u).toBe("https://fcm.googleapis.com/v1/projects/bloodlyn-test/messages:send");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer ya29.test");
      if (body.message.token === "old-phone") {
        return new Response(JSON.stringify({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }), { status: 404 });
      }
      return new Response(JSON.stringify({ name: "projects/bloodlyn-test/messages/1" }), { status: 200 });
    });
    const gone: string[] = [];
    const result = await sendAlert({
      account,
      tokens: ["new-phone", "old-phone"],
      alert: doctorCallAlert(ORDER),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onGoneToken: (t) => gone.push(t),
    });
    expect(result).toEqual({ configured: true, devices: 2, sent: 1 });
    expect(gone).toEqual(["old-phone"]);
    // One sign-in to Google for both phones.
    expect(fetchImpl.mock.calls.filter(([u]) => String(u).includes("oauth2")).length).toBe(1);
  });

  it("sends nothing, and says so, without the Firebase key", async () => {
    const fetchImpl = vi.fn();
    const result = await sendAlert({ account: null, tokens: ["a"], alert: doctorCallAlert(ORDER), fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toEqual({ configured: false, devices: 1, sent: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never throws when Google refuses the key: the ring itself still stands", async () => {
    const { account } = await testAccount();
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 400 }));
    const result = await sendAlert({ account, tokens: ["a"], alert: doctorCallAlert(ORDER), fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toEqual({ configured: true, devices: 1, sent: 0 });
  });

  it("alerts every phone the patient is signed in on, and forgets gone phones", async () => {
    const { account } = await testAccount();
    const deleted: string[] = [];
    const db = {
      from: (table: string) => {
        expect(table).toBe("push_devices");
        return {
          select: () => ({ eq: async (_col: string, userId: string) => ({ data: userId === "patient-1" ? [{ token: "phone-a" }, { token: "phone-b" }] : [], error: null }) }),
          delete: () => ({ eq: async (_col: string, token: string) => { deleted.push(token); return { error: null }; } }),
        };
      },
    };
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("oauth2")) return new Response(JSON.stringify({ access_token: "x", expires_in: 3600 }));
      const token = JSON.parse(String(init?.body)).message.token;
      return token === "phone-b" ? new Response(JSON.stringify({ error: { details: [{ errorCode: "UNREGISTERED" }] } }), { status: 404 }) : new Response("{}");
    });
    expect(await alertUser(db, "patient-1", doctorCallAlert(ORDER), account, fetchImpl as unknown as typeof fetch)).toEqual({ configured: true, devices: 2, sent: 1 });
    expect(deleted).toEqual(["phone-b"]);
    expect(await alertUser(db, null, doctorCallAlert(ORDER), account)).toEqual({ configured: true, devices: 0, sent: 0 });
  });
});
