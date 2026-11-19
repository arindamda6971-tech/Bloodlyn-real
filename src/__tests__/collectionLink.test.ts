import { describe, it, expect } from "vitest";
import {
  cleanCollectionDetails,
  collectionMessage,
  isLinkToken,
  linkExpiry,
  linkState,
  newLinkToken,
} from "../../supabase/functions/_shared/collection-link";
import { callStartProblem, canMove, iceServers, isLive, RING_SECONDS } from "../../supabase/functions/_shared/collection-call";

const NOW = new Date("2026-11-18T06:00:00Z"); // 11:30 in India

const details = cleanCollectionDetails({
  patient_name: "Pk",
  patient_meta: "43 yrs · Female",
  patient_phone: "9876543210",
  phone: "9876543210",
  date: "2026-11-19",
  slot: "08:00 AM - 10:00 AM",
  tests: ["Complete Blood Count", "Thyroid Profile", ""],
  address: "12 Station Road, Kharagpur 721301",
  order_number: "HS20261118-3788",
  lab_name: "Sen Diagnostics",
  lab_phone: "+91 98300 12345",
  partner_name: "Raju",
});

describe("collection link details", () => {
  it("keep only what the page needs, never the patient's phone", () => {
    expect(details).not.toHaveProperty("patient_phone");
    expect(details).not.toHaveProperty("phone");
    expect(details.tests).toEqual(["Complete Blood Count", "Thyroid Profile"]);
    expect(details.lab_phone).toBe("9830012345");
    expect(cleanCollectionDetails({ date: "tomorrow", lab_phone: "12345" })).toMatchObject({ date: "", lab_phone: "" });
  });

  it("write a WhatsApp message with the essentials and the call link, without the patient's number", () => {
    const msg = collectionMessage(details, "https://bloodlyn.app/c/abc");
    expect(msg).toContain("*Home collection - Sen Diagnostics*");
    expect(msg).toContain("Patient: Pk, 43 yrs · Female");
    expect(msg).toContain("Tests: Complete Blood Count, Thyroid Profile");
    expect(msg).toContain("Address: 12 Station Road, Kharagpur 721301");
    expect(msg).toContain("Map: https://maps.google.com/?q=12%20Station%20Road");
    expect(msg.trim().endsWith("https://bloodlyn.app/c/abc")).toBe(true);
    expect(msg).not.toContain("9876543210");
  });

  it("still sends the details before the Partner Portal is online, without a call link", () => {
    const msg = collectionMessage(details, null);
    expect(msg).toContain("Patient: Pk");
    expect(msg).toContain("To reach the patient, please call the lab.");
    expect(msg).not.toContain("/c/");
    expect(msg).not.toContain("9876543210");
  });
});

describe("collection link token and life", () => {
  it("is a long random token, different every time", () => {
    const a = newLinkToken();
    expect(isLinkToken(a)).toBe(true);
    expect(a).toHaveLength(24);
    expect(newLinkToken()).not.toBe(a);
    // Letters and digits only, so WhatsApp never cuts a trailing "-" or "_" off the link.
    for (let i = 0; i < 200; i++) expect(newLinkToken()).toMatch(/^[A-Za-z0-9]{24}$/);
    expect(isLinkToken("../../etc")).toBe(false);
  });

  it("lasts until the end of the day after the collection, within 12 hours to 7 days", () => {
    // Collection on 19 Nov: works until 23:59 India time on 20 Nov.
    expect(linkExpiry("2026-11-19", NOW).toISOString()).toBe("2026-11-20T18:29:59.000Z");
    expect(linkExpiry("", NOW).getTime() - NOW.getTime()).toBe(12 * 3_600_000);
    expect(linkExpiry("2027-01-30", NOW).getTime() - NOW.getTime()).toBe(7 * 24 * 3_600_000);
  });

  it("stops working when replaced, expired, or once the sample is in", () => {
    const link = { expires_at: "2026-11-20T18:29:59Z", revoked_at: null };
    expect(linkState(link, { status: "partner_assigned" }, NOW)).toBe("active");
    expect(linkState({ ...link, revoked_at: NOW.toISOString() }, { status: "partner_assigned" }, NOW)).toBe("revoked");
    expect(linkState(link, { status: "sample_collected" }, NOW)).toBe("closed");
    expect(linkState(link, { status: "accepted", is_escalated: true }, NOW)).toBe("closed");
    expect(linkState(link, null, NOW)).toBe("closed");
    expect(linkState({ ...link, expires_at: "2026-11-18T05:00:00Z" }, { status: "accepted" }, NOW)).toBe("expired");
  });
});

describe("collection calls", () => {
  const at = (secondsAgo: number) => new Date(NOW.getTime() - secondsAgo * 1000).toISOString();

  it("allow one call at a time", () => {
    expect(callStartProblem([{ status: "ringing", created_at: at(10) }], NOW)).toMatch(/already/);
    expect(callStartProblem([{ status: "accepted", created_at: at(300), answered_at: at(290) }], NOW)).toMatch(/already/);
    // A ring that ran out, or a finished call, doesn't block the next one.
    expect(callStartProblem([{ status: "ringing", created_at: at(RING_SECONDS + 5) }], NOW)).toBeNull();
    expect(callStartProblem([{ status: "ended", created_at: at(60) }], NOW)).toBeNull();
  });

  it("can't be used to ring a patient again and again", () => {
    const eight = Array.from({ length: 8 }, (_, i) => ({ status: "missed", created_at: at(100 + i * 60) }));
    expect(callStartProblem(eight, NOW)).toMatch(/Too many calls/);
    expect(callStartProblem(eight.slice(0, 7), NOW)).toBeNull();
  });

  it("move only forward: ringing → answered or not → ended", () => {
    expect(canMove("ringing", "accepted")).toBe(true);
    expect(canMove("accepted", "ended")).toBe(true);
    expect(canMove("ended", "accepted")).toBe(false);
    expect(canMove("declined", "ended")).toBe(false);
    expect(isLive({ status: "ringing", created_at: at(5) }, NOW)).toBe(true);
  });

  it("use free STUN servers, and a TURN relay only when its secrets are set", () => {
    expect(iceServers(() => undefined)).toHaveLength(1);
    const env: Record<string, string> = { TURN_URLS: "turn:turn.example.com:3478, turns:turn.example.com:5349", TURN_USERNAME: "u", TURN_CREDENTIAL: "p" };
    const servers = iceServers((n) => env[n]);
    expect(servers[1]).toEqual({ urls: ["turn:turn.example.com:3478", "turns:turn.example.com:5349"], username: "u", credential: "p" });
  });
});
