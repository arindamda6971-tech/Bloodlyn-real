/**
 * Announcements the BloodLyn team publishes from Admin for this app, read from Admin's
 * public bridge-announcements function (plain text only, live ones only). Each one
 * reaches a person once, as an ordinary notification.
 *
 * Kept cheap: the answer is saved on the device for 5 minutes, so opening the app often
 * costs at most one call per 5 minutes. The device remembers which ones it already got.
 */

export const ADMIN_FUNCTIONS_URL = "https://yhigcsypzwhbjvaqhhwq.supabase.co/functions/v1";
export const ANNOUNCEMENTS_CACHE_MS = 5 * 60 * 1000;
const SEEN_KEEP = 100;

export type AppAudience = "user_app" | "partner_app";

export interface AppAnnouncement {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  publish_at: string | null;
}

const cacheKey = (audience: AppAudience) => `bloodlyn.announcements.${audience}`;
const SEEN_KEY = "bloodlyn.announcements.seen";

const isAnnouncement = (v: unknown): v is AppAnnouncement => {
  const a = v as Partial<AppAnnouncement> | null;
  return !!a && typeof a.id === "string" && typeof a.title === "string" && typeof a.message === "string";
};

function readCache(audience: AppAudience, storage: Storage, now: number): AppAnnouncement[] | null {
  try {
    const saved = JSON.parse(storage.getItem(cacheKey(audience)) ?? "null") as { at?: number; list?: unknown } | null;
    if (!saved || typeof saved.at !== "number" || now - saved.at > ANNOUNCEMENTS_CACHE_MS || !Array.isArray(saved.list)) return null;
    return saved.list.filter(isAnnouncement);
  } catch {
    return null;
  }
}

/** The live announcements for this app, from the device for 5 minutes, then from Admin. */
export async function fetchAnnouncements(
  audience: AppAudience,
  { storage = localStorage, now = Date.now(), fetcher = fetch }: { storage?: Storage; now?: number; fetcher?: typeof fetch } = {},
): Promise<AppAnnouncement[]> {
  const cached = readCache(audience, storage, now);
  if (cached) return cached;
  const res = await fetcher(`${ADMIN_FUNCTIONS_URL}/bridge-announcements?audience=${audience}`);
  if (!res.ok) throw new Error(`Announcements request failed (${res.status})`);
  const body = (await res.json()) as { announcements?: unknown };
  const list = Array.isArray(body?.announcements) ? body.announcements.filter(isAnnouncement) : [];
  try {
    storage.setItem(cacheKey(audience), JSON.stringify({ at: now, list }));
  } catch {
    // A full or blocked store only means the next open asks again.
  }
  return list;
}

/** An announcement with when this device first got it. */
export type SeenAnnouncement = AppAnnouncement & { seen_at: string };

function readSeen(storage: Storage): Record<string, string> {
  try {
    const saved = JSON.parse(storage.getItem(SEEN_KEY) ?? "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Notes the live announcements on this device. `all` is every live one with the time this
 * device first got it; `fresh` is only the ones it hadn't had before, oldest first, so
 * each reaches the person once.
 */
export function recordAnnouncements(
  list: AppAnnouncement[],
  { storage = localStorage, now = Date.now() }: { storage?: Storage; now?: number } = {},
): { all: SeenAnnouncement[]; fresh: SeenAnnouncement[] } {
  const seen = readSeen(storage);
  const at = new Date(now).toISOString();
  const fresh: SeenAnnouncement[] = [];
  const all = list.map((a) => {
    if (!seen[a.id]) {
      seen[a.id] = at;
      fresh.push({ ...a, seen_at: at });
    }
    return { ...a, seen_at: seen[a.id] };
  });
  if (fresh.length) {
    const kept = Object.entries(seen)
      .sort((x, y) => x[1].localeCompare(y[1]))
      .slice(-SEEN_KEEP);
    try {
      storage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(kept)));
    } catch {
      // Not remembered: it may arrive again next time, nothing worse.
    }
  }
  const byPublished = (a: AppAnnouncement, b: AppAnnouncement) => Date.parse(a.publish_at ?? "") - Date.parse(b.publish_at ?? "");
  return { all, fresh: fresh.sort((a, b) => byPublished(a, b) || 0) };
}
