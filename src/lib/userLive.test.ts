import { describe, it, expect, vi, beforeEach } from "vitest";

// A fake Realtime channel that records its subscriptions and lets the test push changes.
const created: Array<{ name: string; handlers: Array<{ table: string; event: string; filter: string; cb: (p: any) => void }> }> = [];
const removed: string[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (name: string) => {
      const entry = { name, handlers: [] as any[] };
      created.push(entry);
      const ch: any = {
        name,
        on: (_type: string, opts: any, cb: (p: any) => void) => {
          entry.handlers.push({ table: opts.table, event: opts.event, filter: opts.filter, cb });
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: (ch: any) => removed.push(ch.name),
  },
}));

const { subscribeUserLive } = await import("./userLive");

const push = (table: string, change: any) => {
  const live = created[created.length - 1];
  live.handlers.filter((h) => h.table === table).forEach((h) => h.cb(change));
};

describe("one shared live channel per user", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    created.length = 0;
    removed.length = 0;
  });

  it("opens one channel for many listeners and fans changes out to each", () => {
    const a = vi.fn();
    const b = vi.fn();
    const stops = [subscribeUserLive("orders", "u1", a), subscribeUserLive("orders", "u1", b)];

    expect(created).toHaveLength(1);
    expect(created[0].name).toBe("user-live-u1");
    // One database subscription, limited to this user's rows.
    expect(created[0].handlers.map((h) => `${h.table}:${h.event}:${h.filter}`)).toEqual(["orders:*:user_id=eq.u1"]);

    const change = { eventType: "UPDATE", new: { id: "o1", status: "accepted" }, old: {} };
    push("orders", change);
    expect(a).toHaveBeenCalledWith(change);
    expect(b).toHaveBeenCalledWith(change);

    stops.forEach((stop) => stop());
    vi.runAllTimers();
  });

  it("keeps the channel while anyone listens and closes it after the last one leaves", () => {
    const stopA = subscribeUserLive("orders", "u2", vi.fn());
    const stopB = subscribeUserLive("orders", "u2", vi.fn());

    stopA();
    vi.runAllTimers();
    expect(removed).toEqual([]);

    stopB();
    vi.runAllTimers();
    expect(removed).toEqual(["user-live-u2"]);
  });

  it("does not re-join when a screen re-subscribes right away", () => {
    const stop = subscribeUserLive("orders", "u3", vi.fn());
    stop();
    const stopAgain = subscribeUserLive("orders", "u3", vi.fn());
    vi.runAllTimers();

    expect(created).toHaveLength(1);
    expect(removed).toEqual([]);
    stopAgain();
    vi.runAllTimers();
  });

  it("a failing listener does not stop the others", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const stops = [subscribeUserLive("orders", "u4", bad), subscribeUserLive("orders", "u4", good)];

    push("orders", { eventType: "INSERT", new: { id: "o9" }, old: {} });
    expect(good).toHaveBeenCalledTimes(1);

    errors.mockRestore();
    stops.forEach((stop) => stop());
    vi.runAllTimers();
  });

  it("switches to the new user's channel on sign-in as someone else", () => {
    const stopOld = subscribeUserLive("orders", "old-user", vi.fn());
    const fresh = vi.fn();
    const stopNew = subscribeUserLive("orders", "new-user", fresh);

    expect(removed).toEqual(["user-live-old-user"]);
    expect(created.map((c) => c.name)).toEqual(["user-live-old-user", "user-live-new-user"]);

    stopOld();
    stopNew();
    vi.runAllTimers();
  });
});
