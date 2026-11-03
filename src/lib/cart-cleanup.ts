/** Items older than this leave the cart, so an old test never turns up in a new booking. */
export const CART_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Before per-account keys every account on a device shared this one, so items moved between accounts. */
export const LEGACY_CART_KEY = "BloodLyn_cart_items";

/** The device copy of one account's cart. */
export const cartStorageKey = (userId?: string | null) => `${LEGACY_CART_KEY}:${userId || "guest"}`;

/** True while an item is under a day old. An item with no time (older builds) is kept. */
export function isFreshCartItem(addedAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!addedAt) return true;
  const time = new Date(addedAt).getTime();
  if (Number.isNaN(time)) return true;
  return now - time < CART_MAX_AGE_MS;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lab ids worth checking: real diagnostic centres, not "doctor-service" style placeholders. */
export const labIdsToCheck = (items: { labId?: string }[]) =>
  [...new Set(items.map((item) => item.labId).filter((id): id is string => !!id && UUID.test(id)))];

/**
 * Splits the cart into items whose lab still takes bookings and items whose lab
 * was removed or switched off. `labs` is what the database returned for labIdsToCheck.
 */
export function splitByOpenLab<T extends { labId?: string }>(
  items: T[],
  labs: { id: string; is_active: boolean | null }[],
): { kept: T[]; removed: T[] } {
  const open = new Set(labs.filter((lab) => lab.is_active !== false).map((lab) => lab.id));
  const kept: T[] = [];
  const removed: T[] = [];
  for (const item of items) {
    if (item.labId && UUID.test(item.labId) && !open.has(item.labId)) removed.push(item);
    else kept.push(item);
  }
  return { kept, removed };
}
