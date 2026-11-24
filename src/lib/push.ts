import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

/**
 * Call alerts: the doctor or the collection partner rings this phone even when BloodLyn
 * is closed (sent by supabase/functions/_shared/push-alerts.ts through Firebase Cloud
 * Messaging, the route Android gives apps; the list of phones lives in Supabase).
 *
 * Android only, and only in a build made with android/app/google-services.json: the
 * app's PushSetup plugin says whether this build has it, because asking for a push
 * token without it closes the app. Everywhere else the in-app ring is all there is.
 */

const PushSetup = registerPlugin<{ isReady(): Promise<{ ready: boolean }> }>("PushSetup");

/**
 * unsupported: web, iPhone, or a build without Firebase · on: this phone rings ·
 * off: BloodLyn hasn't asked yet · blocked: notifications are turned off for BloodLyn.
 */
export type AlertsState = "unsupported" | "on" | "off" | "blocked";

/** The window event for an alert that arrived (app open) or was tapped. */
export const ALERT_EVENT = "bloodlyn:alert";
export interface AlertEventDetail {
  type: string;
  orderId: string | null;
  route: string | null;
  tapped: boolean;
}

/** Where an alert may take the app: only the screens alerts are about. */
export const ALERT_ROUTE = /^\/(appointment|prescription|tracking)\/[0-9a-f-]{8,64}$/i;

/** Android channels, matching the channel_id the server sends. Sound and importance are fixed at creation. */
const CHANNELS = [
  {
    id: "calls",
    name: "Calls",
    description: "Rings when your doctor or collection partner calls you",
    importance: 5 as const,
    visibility: 1 as const,
    sound: "bloodlyn_ring",
    vibration: true,
    lights: true,
    lightColor: "#0474DC",
  },
  { id: "call_updates", name: "Missed calls", description: "A call you didn't answer", importance: 2 as const, visibility: 1 as const, vibration: false },
  { id: "updates", name: "Consultation updates", description: "Prescriptions and changes to your consultations", importance: 3 as const, visibility: 0 as const, vibration: true },
];

let supported: Promise<boolean> | null = null;
let listening: Promise<void> | null = null;
let channelsMade: Promise<void> | null = null;
let token: string | null = null;

/** Whether this phone can get call alerts at all. */
export function alertsSupported(): Promise<boolean> {
  if (!supported) {
    supported = (async () => {
      if (Capacitor.getPlatform() !== "android") return false;
      try {
        return (await PushSetup.isReady()).ready === true;
      } catch {
        // An older build without the PushSetup plugin: no Firebase in it either.
        return false;
      }
    })();
  }
  return supported;
}

/** True once this phone is signed up for alerts in this session (the in-app ring then skips its own notification). */
export const alertsRegistered = () => token !== null;

// The typed client doesn't know these two functions yet (migration 20261124120000_push_devices).
const rpc = (fn: "register_push_device" | "unregister_push_device", args: Record<string, unknown>) =>
  (supabase as unknown as { rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { message: string } | null }> }).rpc(fn, args);

async function saveToken(value: string) {
  const version = (await App.getInfo().catch(() => null))?.version ?? null;
  const { error } = await rpc("register_push_device", { _token: value, _platform: "android", _app_version: version });
  if (error) {
    console.error("Couldn't sign this phone up for call alerts:", error.message);
    return;
  }
  token = value;
}

const text = (v: unknown) => (typeof v === "string" && v ? v : null);

function emit(data: unknown, tapped: boolean) {
  const d = (data ?? {}) as Record<string, unknown>;
  const route = text(d.route);
  const detail: AlertEventDetail = {
    type: text(d.type) ?? "",
    orderId: text(d.orderId),
    route: route && ALERT_ROUTE.test(route) ? route : null,
    tapped,
  };
  window.dispatchEvent(new CustomEvent<AlertEventDetail>(ALERT_EVENT, { detail }));
}

function listen(): Promise<void> {
  if (!listening) {
    listening = (async () => {
      await PushNotifications.addListener("registration", (t) => void saveToken(t.value));
      await PushNotifications.addListener("registrationError", (e) => console.error("Call alerts: couldn't register this phone", e.error));
      // With the app open nothing shows on its own: the screens ring instead.
      await PushNotifications.addListener("pushNotificationReceived", (n) => emit(n.data, false));
      // A tap, even one that started the app: it arrives as soon as this listener exists.
      await PushNotifications.addListener("pushNotificationActionPerformed", (a) => emit(a.notification?.data, true));
    })();
  }
  return listening;
}

function makeChannels(): Promise<void> {
  if (!channelsMade) {
    channelsMade = Promise.all(CHANNELS.map((c) => PushNotifications.createChannel(c).catch((err) => console.error(`Channel ${c.id}:`, err)))).then(() => undefined);
  }
  return channelsMade;
}

const stateOf = (receive: string): AlertsState => (receive === "granted" ? "on" : receive === "denied" ? "blocked" : "off");

/** Where alerts stand on this phone, without asking anything. */
export async function alertsState(): Promise<AlertsState> {
  if (!(await alertsSupported())) return "unsupported";
  return stateOf((await PushNotifications.checkPermissions()).receive);
}

/**
 * At sign-in: listen for alerts and, when notifications are already allowed, sign this
 * phone up (again: Firebase may have given it a new token). Never asks the person.
 */
export async function startAlerts(): Promise<AlertsState> {
  if (!(await alertsSupported())) return "unsupported";
  await listen();
  await makeChannels();
  const state = stateOf((await PushNotifications.checkPermissions()).receive);
  if (state === "on") await PushNotifications.register();
  return state;
}

/** The person chose to turn alerts on: Android asks them, then this phone is signed up. */
export async function turnOnAlerts(): Promise<AlertsState> {
  if (!(await alertsSupported())) return "unsupported";
  await listen();
  await makeChannels();
  const state = stateOf((await PushNotifications.requestPermissions()).receive);
  if (state === "on") await PushNotifications.register();
  return state === "off" ? "blocked" : state;
}

/** Signing out: this phone stops getting this person's alerts. Never holds up signing out. */
export async function forgetThisPhone(): Promise<void> {
  if (!token) return;
  const value = token;
  token = null;
  try {
    await Promise.race([rpc("unregister_push_device", { _token: value }), new Promise((resolve) => setTimeout(resolve, 3000))]);
  } catch (err) {
    console.error("Couldn't stop call alerts on this phone:", err);
  }
}
