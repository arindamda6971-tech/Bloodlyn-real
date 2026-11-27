import { describe, it, expect, beforeEach, vi } from "vitest";
import { ANNOUNCEMENTS_CACHE_MS, fetchAnnouncements, recordAnnouncements, type AppAnnouncement } from "./app-announcements";

const a = (id: string, publish_at = "2026-11-20T00:00:00Z"): AppAnnouncement => ({
  id,
  title: `Title ${id}`,
  message: `Message ${id}`,
  type: "info",
  priority: "normal",
  publish_at,
});

const reply = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response);

describe("app announcements", () => {
  beforeEach(() => localStorage.clear());

  it("asks Admin once, then uses the saved answer for 5 minutes", async () => {
    const fetcher = reply({ announcements: [a("1"), { id: 2 }] });
    const now = Date.parse("2026-11-27T10:00:00Z");
    expect(await fetchAnnouncements("user_app", { now, fetcher })).toEqual([a("1")]);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("bridge-announcements?audience=user_app"));

    await fetchAnnouncements("user_app", { now: now + ANNOUNCEMENTS_CACHE_MS - 1000, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await fetchAnnouncements("user_app", { now: now + ANNOUNCEMENTS_CACHE_MS + 1000, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails without saving anything when Admin can't answer", async () => {
    await expect(fetchAnnouncements("user_app", { fetcher: reply({}, false) })).rejects.toThrow();
    const fetcher = reply({ announcements: [a("1")] });
    await fetchAnnouncements("user_app", { fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("hands each announcement over once per device, oldest first", () => {
    const first = Date.parse("2026-11-27T10:00:00Z");
    const one = recordAnnouncements([a("new", "2026-11-26T00:00:00Z"), a("old", "2026-11-01T00:00:00Z")], { now: first });
    expect(one.fresh.map((x) => x.id)).toEqual(["old", "new"]);

    // Five minutes later the same two are live, plus a third: only the third is new.
    const later = first + 5 * 60 * 1000;
    const two = recordAnnouncements([a("new"), a("old"), a("third")], { now: later });
    expect(two.fresh.map((x) => x.id)).toEqual(["third"]);
    // Every live one keeps the time this device first got it.
    expect(two.all.find((x) => x.id === "old")?.seen_at).toBe(new Date(first).toISOString());
    expect(two.all.find((x) => x.id === "third")?.seen_at).toBe(new Date(later).toISOString());

    expect(recordAnnouncements([a("new"), a("old"), a("third")], { now: later + 1000 }).fresh).toEqual([]);
  });
});
