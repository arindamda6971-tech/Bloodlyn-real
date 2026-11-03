// One order key per visit to the payment page. Pressing Back after booking returns
// to that same page (same history entry, same key), so a second "Place order" gets
// the order already placed back from create-order instead of creating another one.

const PLACED_PREFIX = "bl_placed_checkout_";

const randomKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** The order key for the payment page at this history entry (react-router's location.key). */
export const checkoutKeyFor = (locationKey: string | undefined) =>
  `checkout-${locationKey && locationKey !== "default" ? locationKey : randomKey()}`;

export const markCheckoutPlaced = (checkoutKey: string, orderId: string | null) => {
  try {
    sessionStorage.setItem(PLACED_PREFIX + checkoutKey, orderId || "placed");
  } catch {
    // Storage can be unavailable; the server still returns the same order for this key.
  }
};

export const isCheckoutPlaced = (checkoutKey: string) => {
  try {
    return sessionStorage.getItem(PLACED_PREFIX + checkoutKey) !== null;
  } catch {
    return false;
  }
};
