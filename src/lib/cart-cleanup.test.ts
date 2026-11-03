import { describe, expect, it } from "vitest";
import { CART_MAX_AGE_MS, cartStorageKey, isFreshCartItem, labIdsToCheck, splitByOpenLab } from "./cart-cleanup";

const LAB_A = "3cc443c4-3663-41a7-90a5-41223207b671";
const GONE = "e19172fa-ac95-46c6-937e-1f42ad962d1c";

describe("cartStorageKey", () => {
  it("gives every account its own device copy", () => {
    expect(cartStorageKey("user-1")).not.toBe(cartStorageKey("user-2"));
    expect(cartStorageKey(null)).toBe("BloodLyn_cart_items:guest");
  });
});

describe("isFreshCartItem", () => {
  const now = new Date("2026-11-03T18:00:00Z").getTime();
  it("keeps items under a day old and drops older ones", () => {
    expect(isFreshCartItem(new Date(now - CART_MAX_AGE_MS + 60_000).toISOString(), now)).toBe(true);
    expect(isFreshCartItem(new Date(now - CART_MAX_AGE_MS).toISOString(), now)).toBe(false);
  });

  it("keeps an item with no usable time", () => {
    expect(isFreshCartItem(undefined, now)).toBe(true);
    expect(isFreshCartItem("not a date", now)).toBe(true);
  });
});

describe("splitByOpenLab", () => {
  const items = [
    { id: "1", labId: LAB_A },
    { id: "2", labId: GONE },
    { id: "3", labId: "doctor-service" },
    { id: "4" },
  ];

  it("checks only real lab ids", () => {
    expect(labIdsToCheck(items)).toEqual([LAB_A, GONE]);
  });

  it("removes items whose lab no longer exists or is switched off", () => {
    expect(splitByOpenLab(items, [{ id: LAB_A, is_active: true }]).removed.map((i) => i.id)).toEqual(["2"]);
    expect(splitByOpenLab(items, [{ id: LAB_A, is_active: false }, { id: GONE, is_active: true }]).removed.map((i) => i.id)).toEqual(["1"]);
  });

  it("keeps service and lab-less items", () => {
    expect(splitByOpenLab(items, [{ id: LAB_A, is_active: true }]).kept.map((i) => i.id)).toEqual(["1", "3", "4"]);
  });
});
