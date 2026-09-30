import { describe, expect, it } from "vitest";
import { calculateDeliveryFee, normalizeDeliveryFeeRules } from "./delivery-fee";

const rules = [
  { min_mrp: 100, max_mrp: 200, fee: 50, is_active: true },
  { min_mrp: 100, max_mrp: 500, fee: 30, is_active: true },
  { min_mrp: 500, max_mrp: 1000, fee: 50, is_active: true },
  { min_mrp: 1000, max_mrp: 2500, fee: 80, is_active: true },
];

describe("delivery fee rules", () => {
  it("uses the matching MRP range before discount", () => {
    expect(calculateDeliveryFee(rules, 1294)).toBe(80);
  });

  it("chooses the most specific rule when ranges overlap", () => {
    expect(calculateDeliveryFee(rules, 150)).toBe(50);
  });

  it("includes exact boundaries and supports an open-ended range", () => {
    expect(calculateDeliveryFee(rules, 1000)).toBe(50);
    expect(calculateDeliveryFee([{ min_mrp: 2501, max_mrp: null, fee: 90 }], 3000)).toBe(90);
  });

  it("ignores inactive and malformed rules and falls back to zero", () => {
    expect(normalizeDeliveryFeeRules([
      { min_mrp: 0, max_mrp: 100, fee: 20, is_active: false },
      { min_mrp: 500, max_mrp: 100, fee: 20 },
      { min_mrp: 0, max_mrp: 100, fee: -1 },
    ])).toEqual([]);
    expect(calculateDeliveryFee(rules, 99)).toBe(0);
  });
});