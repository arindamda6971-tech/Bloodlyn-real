import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutKeyFor, isCheckoutPlaced, markCheckoutPlaced } from "./checkout-key";
import { goBackOr } from "./go-back";

describe("checkout key", () => {
  beforeEach(() => sessionStorage.clear());

  it("is the same for the same payment page, so Back can't place a second order", () => {
    expect(checkoutKeyFor("abc123")).toBe(checkoutKeyFor("abc123"));
    expect(checkoutKeyFor("abc123")).not.toBe(checkoutKeyFor("xyz789"));
  });

  it("never shares the router's placeholder key between checkouts", () => {
    expect(checkoutKeyFor("default")).not.toBe(checkoutKeyFor("default"));
  });

  it("remembers a placed checkout", () => {
    const key = checkoutKeyFor("abc123");
    expect(isCheckoutPlaced(key)).toBe(false);
    markCheckoutPlaced(key, "order-1");
    expect(isCheckoutPlaced(key)).toBe(true);
  });
});

describe("goBackOr", () => {
  it("goes back when there's a page to go back to", () => {
    const navigate = vi.fn();
    window.history.replaceState({ idx: 2 }, "");
    goBackOr(navigate, "/profile");
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("opens the fallback page when opened directly", () => {
    const navigate = vi.fn();
    window.history.replaceState({ idx: 0 }, "");
    goBackOr(navigate, "/profile");
    expect(navigate).toHaveBeenCalledWith("/profile", { replace: true });
  });
});
