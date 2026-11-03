import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { labServesPincode } from "@/hooks/useUserPincode";
import { evaluateLabServiceability } from "@/lib/labServiceability";

describe("create-order service area", () => {
  const source = readFileSync("supabase/functions/create-order/index.ts", "utf8");

  it("uses the same PIN rule as the app", () => {
    expect(source).toContain('import { labServesPincode } from "../_shared/service-area.ts"');
    expect(source).toContain("labServesPincode(areaLab, addressPincode)");
  });

  it("refuses a lab visit outside the lab's area before any order is saved", () => {
    expect(source).toContain('code: "lab_not_serviceable"');
    expect(source.indexOf('code: "lab_not_serviceable"')).toBeLessThan(source.indexOf('.from("orders")'));
  });
});

describe("labServesPincode", () => {
  it("serves every PIN the lab added on the Partner portal", () => {
    const lab = { pincode: "700016", service_pincodes: ["700017", "700019"] };
    expect(labServesPincode(lab, "700017")).toBe(true);
    expect(labServesPincode(lab, "700019")).toBe(true);
  });

  it("always serves the lab's own PIN, even when it is missing from the list", () => {
    const lab = { pincode: "700016", service_pincodes: ["700017"] };
    expect(labServesPincode(lab, "700016")).toBe(true);
  });

  it("serves only its own PIN when no service PINs are set", () => {
    const lab = { pincode: "700016", service_pincodes: [] };
    expect(labServesPincode(lab, "700016")).toBe(true);
    expect(labServesPincode(lab, "700017")).toBe(false);
  });

  it("hides a lab with no PIN at all instead of showing it everywhere", () => {
    expect(labServesPincode({ pincode: "", service_pincodes: [] }, "700016")).toBe(false);
    expect(labServesPincode({ pincode: null, service_pincodes: null }, "700016")).toBe(false);
  });

  it("does not match the placeholder PIN of a lab whose address is missing", () => {
    expect(labServesPincode({ pincode: "000000", service_pincodes: [] }, "700016")).toBe(false);
  });

  it("matches whole PINs only", () => {
    expect(labServesPincode({ pincode: "", service_pincodes: ["7000161"] }, "700016")).toBe(false);
    expect(labServesPincode({ pincode: "700016, 700020", service_pincodes: [] }, "700020")).toBe(true);
  });

  it("lets every lab through until the user has a PIN", () => {
    expect(labServesPincode({ pincode: "700016" }, null)).toBe(true);
  });
});

describe("evaluateLabServiceability", () => {
  it("checks the collection address PIN, not just the header PIN", () => {
    const lab = { pincode: "700016", service_pincodes: ["700017"], is_active: true };
    expect(evaluateLabServiceability(lab, { pincode: "700017" })).toEqual({ serviceable: true, reason: null });
    expect(evaluateLabServiceability(lab, { pincode: "711101" })).toEqual({ serviceable: false, reason: "pincode" });
  });

  it("blocks a closed lab", () => {
    expect(evaluateLabServiceability({ pincode: "700016", is_active: false }, { pincode: "700016" }).reason).toBe("inactive");
  });
});
