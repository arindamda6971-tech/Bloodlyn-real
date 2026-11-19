/**
 * Calls from a collection partner's link to the patient's BloodLyn app.
 *
 * The voice goes phone-to-phone over the internet (WebRTC). The two phones find each
 * other through a Realtime channel with a random name (`room`) that only this call's
 * two sides know. Phase one uses free public STUN servers; a TURN relay (for networks
 * that block direct connections) can be added later with the TURN_* secrets, without
 * changing the app.
 */

/** How long the patient's app rings before the call counts as missed. */
export const RING_SECONDS = 45;
/** A call that was answered but never ended is treated as over after this. */
export const MAX_CALL_MINUTES = 60;
/** So a link can't be used to ring a patient again and again. */
export const MAX_CALLS_PER_HOUR = 8;

export type CallStatus = "ringing" | "accepted" | "declined" | "missed" | "ended" | "failed";

export interface CallRow {
  status: CallStatus | string;
  created_at: string;
  answered_at?: string | null;
}

const ago = (iso: string | null | undefined, now: Date) => (iso ? now.getTime() - Date.parse(iso) : Number.POSITIVE_INFINITY);

/** Still ringing, or answered and not ended (within reason). */
export function isLive(call: CallRow, now = new Date()): boolean {
  if (call.status === "ringing") return ago(call.created_at, now) < RING_SECONDS * 1000;
  if (call.status === "accepted") return ago(call.answered_at ?? call.created_at, now) < MAX_CALL_MINUTES * 60_000;
  return false;
}

/** Why a new call can't start now, or null when it can. */
export function callStartProblem(recent: CallRow[], now = new Date()): string | null {
  if (recent.some((c) => isLive(c, now))) return "A call to this patient is already going on.";
  const lastHour = recent.filter((c) => ago(c.created_at, now) < 3_600_000).length;
  if (lastHour >= MAX_CALLS_PER_HOUR) return "Too many calls in the last hour. Please ask the lab to call the patient.";
  return null;
}

/** Which call states may follow which; anything else is ignored. */
const NEXT: Record<string, CallStatus[]> = {
  ringing: ["accepted", "declined", "missed", "ended", "failed"],
  accepted: ["ended", "failed"],
};
export const canMove = (from: string, to: CallStatus) => (NEXT[from] ?? []).includes(to);

/** A random channel name for the two phones. */
export function newRoom(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** STUN (free) always; TURN when its secrets are set. */
export function iceServers(env: (name: string) => string | undefined): IceServer[] {
  const servers: IceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
  const turn = (env("TURN_URLS") ?? "").split(",").map((u) => u.trim()).filter((u) => /^turns?:/.test(u));
  const username = env("TURN_USERNAME");
  const credential = env("TURN_CREDENTIAL");
  if (turn.length && username && credential) servers.push({ urls: turn, username, credential });
  return servers;
}

// ── The patient calling the collection partner (direction "to_partner") ──────────

/** A patient may call the partner this many times an hour. */
export const PATIENT_CALLS_PER_HOUR = 5;
/** After a call the partner didn't take, the patient waits this long before calling again. */
export const PATIENT_RETRY_SECONDS = 60;
/** The lab is told when the partner has missed this many of a patient's calls in an hour. */
export const MISSES_BEFORE_LAB_ALERT = 2;

export interface DirectedCallRow extends CallRow {
  direction?: string | null;
}

/** Why the patient can't call the partner now, or null. `recent`: this order's calls in the last hour, both ways. */
export function partnerCallProblem(recent: DirectedCallRow[], now = new Date()): string | null {
  if (recent.some((c) => isLive(c, now))) return "A call with your collection partner is already going on.";
  const mine = recent
    .filter((c) => c.direction === "to_partner" && ago(c.created_at, now) < 3_600_000)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  if (mine.length >= PATIENT_CALLS_PER_HOUR) return "You've called several times in the last hour. The lab has been told and will help you.";
  const last = mine[0];
  if (last && last.status !== "accepted" && last.status !== "ended" && ago(last.created_at, now) < PATIENT_RETRY_SECONDS * 1000) {
    return "Please wait a minute before calling again.";
  }
  return null;
}

/** Tell the lab once: on exactly the Nth missed call in the hour, not again on the next ones. */
export const shouldAlertLab = (missesInLastHour: number) => missesInLastHour === MISSES_BEFORE_LAB_ALERT;
