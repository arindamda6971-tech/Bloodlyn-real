import { describe, expect, it } from "vitest";
import { parsePlatformFeeFlat } from "./usePlatformFee";

describe("parsePlatformFeeFlat", () => {
  it("reads the Admin data field", () => {
    expect(parsePlatformFeeFlat({ data: { lab_test_platform_fee_flat: 49 } })).toBe(49);
  });

  it("accepts zero and numeric strings", () => {
    expect(parsePlatformFeeFlat({ data: { lab_test_platform_fee_flat: 0 } })).toBe(0);
    expect(parsePlatformFeeFlat({ data: { lab_test_platform_fee_flat: "25.5" } })).toBe(25.5);
  });

  it("rejects missing, negative, and non-numeric values", () => {
    expect(parsePlatformFeeFlat({ data: {} })).toBeNull();
    expect(parsePlatformFeeFlat({ data: { lab_test_platform_fee_flat: -1 } })).toBeNull();
    expect(parsePlatformFeeFlat({ data: { lab_test_platform_fee_flat: "free" } })).toBeNull();
  });

  it("supports settings response wrappers", () => {
    expect(parsePlatformFeeFlat({ settings: { lab_test_platform_fee_flat: 30 } })).toBe(30);
    expect(parsePlatformFeeFlat({ data: { settings: { lab_test_platform_fee_flat: 35 } } })).toBe(35);
  });
});