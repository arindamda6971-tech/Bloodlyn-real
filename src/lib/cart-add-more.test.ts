import { describe, it, expect } from "vitest";
import { addMoreTestsPath } from "./cart-cleanup";

describe("Cart: Add more tests", () => {
  it("goes back to the lab the cart's tests are from", () => {
    expect(addMoreTestsPath("3f2a9c1e-0000-4000-8000-000000000001")).toBe("/lab/3f2a9c1e-0000-4000-8000-000000000001");
  });
  it("falls back to the test list when the cart has no lab", () => {
    expect(addMoreTestsPath(null)).toBe("/categories");
    expect(addMoreTestsPath("")).toBe("/categories");
    expect(addMoreTestsPath("   ")).toBe("/categories");
  });
});
