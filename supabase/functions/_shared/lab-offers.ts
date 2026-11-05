// Lab offers, shared by the app (checkout, lab page) and create-order, so the
// discount a patient sees is the discount the server charges.
//
// Labs create offers in the Partner portal. Its profile sync copies the active
// ones onto diagnostic_centers.offers (a JSON array, like delivery_fee_rules),
// so they are read with the lab row and need no table or policy of their own.

export type LabOfferType = "free_delivery" | "percentage_discount" | "flat_discount";

export interface LabOffer {
  id: string;
  type: LabOfferType;
  min_order_amount: number;
  /** Percent for percentage_discount, rupees for flat_discount, 0 for free_delivery. */
  discount_value: number;
  /** Rupee cap for percentage_discount; null means no cap. */
  max_discount_cap: number | null;
  /** yyyy-mm-dd, inclusive, India time. */
  start_date: string;
  end_date: string;
}

const TYPES: LabOfferType[] = ["free_delivery", "percentage_discount", "flat_discount"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const amount = (value: unknown): number | null => {
  const n = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Valid offers only; anything malformed is dropped rather than guessed at. */
export function normalizeLabOffers(value: unknown): LabOffer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): LabOffer[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const type = row.type as LabOfferType;
    const id = typeof row.id === "string" ? row.id : "";
    const min = amount(row.min_order_amount);
    const value = amount(row.discount_value) ?? 0;
    const cap = row.max_discount_cap == null ? null : amount(row.max_discount_cap);
    const start = typeof row.start_date === "string" ? row.start_date.slice(0, 10) : "";
    const end = typeof row.end_date === "string" ? row.end_date.slice(0, 10) : "";
    if (!id || !TYPES.includes(type) || min === null || row.is_active === false) return [];
    if (!DATE.test(start) || !DATE.test(end) || end < start) return [];
    if (type === "percentage_discount" && (value <= 0 || value > 100)) return [];
    if (type === "flat_discount" && value <= 0) return [];
    if (cap !== null && cap <= 0) return [];
    return [{
      id,
      type,
      min_order_amount: min,
      discount_value: type === "free_delivery" ? 0 : value,
      max_discount_cap: type === "percentage_discount" ? cap : null,
      start_date: start,
      end_date: end,
    }];
  });
}

/** Today's date in India (yyyy-mm-dd); offers run by the lab's calendar day. */
export function indiaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

/** Offers running today, newest first by start date. */
export function activeLabOffers(value: unknown, today: string = indiaToday()): LabOffer[] {
  return normalizeLabOffers(value)
    .filter((offer) => offer.start_date <= today && today <= offer.end_date)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
}

/** An order of `subtotal` (tests, before any discount) qualifies for the offer. */
export const offerApplies = (offer: LabOffer, subtotal: number): boolean =>
  Number.isFinite(subtotal) && subtotal >= offer.min_order_amount;

/**
 * What the offer takes off an order: rupees off the tests, and whether the home
 * collection fee is waived. Whole rupees, never more than the subtotal.
 */
export function offerSavings(offer: LabOffer, subtotal: number): { discount: number; freeCollection: boolean } {
  if (!offerApplies(offer, subtotal)) return { discount: 0, freeCollection: false };
  if (offer.type === "free_delivery") return { discount: 0, freeCollection: true };
  let off = offer.type === "flat_discount" ? offer.discount_value : (subtotal * offer.discount_value) / 100;
  if (offer.type === "percentage_discount" && offer.max_discount_cap !== null) off = Math.min(off, offer.max_discount_cap);
  return { discount: Math.max(0, Math.min(Math.round(off), Math.floor(subtotal))), freeCollection: false };
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** One line for patients, e.g. "10% off on orders of ₹500 or more (up to ₹150)". */
export function describeLabOffer(offer: LabOffer): string {
  const min = offer.min_order_amount > 0 ? ` on orders of ${rupees(offer.min_order_amount)} or more` : "";
  switch (offer.type) {
    case "free_delivery":
      return `Free home collection${min}`;
    case "percentage_discount":
      return `${offer.discount_value}% off${min}${offer.max_discount_cap !== null ? ` (up to ${rupees(offer.max_discount_cap)})` : ""}`;
    case "flat_discount":
      return `${rupees(offer.discount_value)} off${min}`;
  }
}
