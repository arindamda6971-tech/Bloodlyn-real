import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ANNOUNCEMENTS_CACHE_MS,
  dismissAnnouncement,
  dismissedAnnouncements,
  fetchAnnouncements,
  visibleAnnouncements,
  type AppAnnouncement,
} from "./app-announcements";

const a = (id: string, priority = "normal", publish_at = "2026-11-20T00:00:00Z"): AppAnnouncement => ({
  id,
  title: `Title ${id}`,
  message: `Message ${id}`,
  type: "info",
  priority,
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

  it("keeps closed ones closed and shows urgent first, then the newest", () => {
    dismissAnnouncement("old");
    dismissAnnouncement("old");
    expect(dismissedAnnouncements()).toEqual(["old"]);

    const list = [a("old"), a("new", "normal", "2026-11-26T00:00:00Z"), a("older", "normal", "2026-11-01T00:00:00Z"), a("urgent", "urgent", "2026-10-01T00:00:00Z")];
    expect(visibleAnnouncements(list, dismissedAnnouncements()).map((x) => x.id)).toEqual(["urgent", "new", "older"]);
  });
});
