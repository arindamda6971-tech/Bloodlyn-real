/**
 * Announcements the BloodLyn team publishes from Admin for this app, read from Admin's
 * public bridge-announcements function (plain text only, live ones only).
 *
 * Kept cheap: the answer is saved on the device for 5 minutes, so opening the app often
 * costs at most one call per 5 minutes. An announcement the person closes stays closed
 * on this device.
 */

export const ADMIN_FUNCTIONS_URL = "https://yhigcsypzwhbjvaqhhwq.supabase.co/functions/v1";
export const ANNOUNCEMENTS_CACHE_MS = 5 * 60 * 1000;
const DISMISSED_KEEP = 50;

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
const DISMISSED_KEY = "bloodlyn.announcements.dismissed";

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

export function dismissedAnnouncements(storage: Storage = localStorage): string[] {
  try {
    const ids = JSON.parse(storage.getItem(DISMISSED_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function dismissAnnouncement(id: string, storage: Storage = localStorage): void {
  const ids = [...dismissedAnnouncements(storage).filter((x) => x !== id), id].slice(-DISMISSED_KEEP);
  try {
    storage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    // Not remembered: it shows again next time, nothing worse.
  }
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, important: 1, normal: 2 };

/** What to show: not closed on this device, urgent first, then the newest. */
export function visibleAnnouncements(list: AppAnnouncement[], dismissed: string[]): AppAnnouncement[] {
  const closed = new Set(dismissed);
  return list
    .filter((a) => !closed.has(a.id))
    .sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) ||
        Date.parse(b.publish_at ?? "") - Date.parse(a.publish_at ?? ""),
    );
}
