import { describe, it, expect, vi, beforeEach } from "vitest";

// The phone: its platform, whether this build has Firebase, and the push plugin.
const phone = vi.hoisted(() => ({
  platform: "android",
  firebase: true,
  permission: "granted" as string,
  afterRequest: "granted" as string,
  listeners: {} as Record<string, (e: unknown) => void>,
  register: vi.fn(async () => {}),
  createChannel: vi.fn(async () => {}),
  requestPermissions: vi.fn(),
  rpc: vi.fn(async () => ({ error: null })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => phone.platform, isNativePlatform: () => phone.platform !== "web" },
  registerPlugin: () => ({
    isReady: async () => {
      if (phone.firebase === undefined) throw new Error("not implemented");
      return { ready: phone.firebase };
    },
  }),
}));
vi.mock("@capacitor/app", () => ({ App: { getInfo: async () => ({ version: "1.0.2" }) } }));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    addListener: async (event: string, fn: (e: unknown) => void) => {
      phone.listeners[event] = fn;
      return { remove: async () => {} };
    },
    checkPermissions: async () => ({ receive: phone.permission }),
    requestPermissions: async () => {
      phone.requestPermissions();
      phone.permission = phone.afterRequest;
      return { receive: phone.permission };
    },
    register: phone.register,
    createChannel: phone.createChannel,
  },
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: phone.rpc } }));

const load = async () => {
  vi.resetModules();
  return import("@/lib/push");
};

describe("call alerts on the phone", () => {
  beforeEach(() => {
    Object.assign(phone, { platform: "android", firebase: true, permission: "granted", afterRequest: "granted", listeners: {} });
    phone.register.mockClear();
    phone.createChannel.mockClear();
    phone.requestPermissions.mockClear();
    phone.rpc.mockClear();
  });

  it("does nothing on the web", async () => {
    phone.platform = "web";
    const push = await load();
    expect(await push.startAlerts()).toBe("unsupported");
    expect(phone.register).not.toHaveBeenCalled();
  });

  it("never asks Firebase for a token in a build without it, which would close the app", async () => {
    phone.firebase = false;
    const push = await load();
    expect(await push.startAlerts()).toBe("unsupported");
    expect(await push.turnOnAlerts()).toBe("unsupported");
    expect(phone.register).not.toHaveBeenCalled();
    expect(phone.requestPermissions).not.toHaveBeenCalled();
  });

  it("treats an older app build without the PushSetup check as having no alerts", async () => {
    (phone as { firebase: boolean | undefined }).firebase = undefined;
    const push = await load();
    expect(await push.alertsState()).toBe("unsupported");
    expect(phone.register).not.toHaveBeenCalled();
  });

  it("signs the phone up at sign-in when notifications are allowed, with a ringing Calls channel", async () => {
    const push = await load();
    expect(await push.startAlerts()).toBe("on");
    expect(phone.register).toHaveBeenCalledOnce();
    expect(phone.createChannel).toHaveBeenCalledWith(expect.objectContaining({ id: "calls", importance: 5, sound: "bloodlyn_ring" }));
    expect(phone.createChannel).toHaveBeenCalledWith(expect.objectContaining({ id: "call_updates", importance: 2 }));

    expect(push.alertsRegistered()).toBe(false);
    phone.listeners.registration({ value: "fcm-token-1234567890abcdef" });
    await vi.waitFor(() => expect(push.alertsRegistered()).toBe(true));
    expect(phone.rpc).toHaveBeenCalledWith("register_push_device", { _token: "fcm-token-1234567890abcdef", _platform: "android", _app_version: "1.0.2" });

    await push.forgetThisPhone();
    expect(phone.rpc).toHaveBeenLastCalledWith("unregister_push_device", { _token: "fcm-token-1234567890abcdef" });
    expect(push.alertsRegistered()).toBe(false);
  });

  it("never asks by itself: only the person's tap on Allow does", async () => {
    phone.permission = "prompt";
    const push = await load();
    expect(await push.startAlerts()).toBe("off");
    expect(phone.requestPermissions).not.toHaveBeenCalled();
    expect(phone.register).not.toHaveBeenCalled();

    expect(await push.turnOnAlerts()).toBe("on");
    expect(phone.requestPermissions).toHaveBeenCalledOnce();
    expect(phone.register).toHaveBeenCalledOnce();
  });

  it("says when notifications are turned off for BloodLyn", async () => {
    phone.permission = "prompt";
    phone.afterRequest = "denied";
    const push = await load();
    expect(await push.turnOnAlerts()).toBe("blocked");
    expect(await push.alertsState()).toBe("blocked");
    expect(phone.register).not.toHaveBeenCalled();
  });

  it("passes a tapped alert on to the app, and only to the screens alerts are about", async () => {
    const push = await load();
    await push.startAlerts();
    const seen: unknown[] = [];
    const onAlert = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(push.ALERT_EVENT, onAlert);
    const id = "0b6f6d2e-1c2a-4f6e-9a51-7a3c1f0e9d11";
    phone.listeners.pushNotificationActionPerformed({ actionId: "tap", notification: { data: { type: "doctor_call", orderId: id, route: `/appointment/${id}` } } });
    phone.listeners.pushNotificationReceived({ data: { type: "collection_call", orderId: id, route: "https://evil.example/x" } });
    window.removeEventListener(push.ALERT_EVENT, onAlert);
    expect(seen).toEqual([
      { type: "doctor_call", orderId: id, route: `/appointment/${id}`, tapped: true },
      { type: "collection_call", orderId: id, route: null, tapped: false },
    ]);
  });
});
