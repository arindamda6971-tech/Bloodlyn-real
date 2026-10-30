import { describe, it, expect } from "vitest";
import {
  audienceText,
  categoriesWithPackages,
  fastingText,
  groupIncludedTests,
  prettyGroupName,
  formatRupees,
  coversPreview,
  savings,
  includedPreview,
  reportText,
  sortPackages,
  toHealthPackage,
} from "./health-packages";

const row = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Full Body Essential",
  price: 999,
  original_price: 1999,
  discount_percent: 50,
  tests_count: 3,
  is_popular: false,
  diagnostic_centers: { id: "lab-1", name: "Das Diagnostics", logo_url: null, vendor_id: "v-1" },
  ...over,
});

describe("toHealthPackage", () => {
  it("formats prices the Indian way and summarises what a package covers", () => {
    expect(formatRupees(152000)).toBe("₹1,52,000");
    expect(formatRupees(25)).toBe("₹25");
    const p = toHealthPackage(row({ included_tests: [
      { name: "SGPT", category: "liver-function" }, { name: "SGOT", category: "liver-function" },
      { name: "TSH", category: "thyroid" }, { name: "CBC", category: "haematology" },
    ] }));
    expect(coversPreview(p)).toBe("Liver function, Haematology +1");
  });

  it("reads the details labs set in the Partner portal", () => {
    const p = toHealthPackage(row({
      category: "full_body", gender: "female", age_group: "adult", fasting_hours: 10, report_hours: 24,
      sample_type: "blood_urine", included_tests: [{ name: "CBC", category: "Haematology" }, { name: "TSH", category: "Thyroid" }],
    }));
    expect(p.category).toBe("full_body");
    expect(p.lab).toMatchObject({ id: "lab-1", name: "Das Diagnostics", logo: null, vendorId: "v-1" });
    expect(savings(p)).toBe(1000);
    expect(fastingText(p)).toBe("Fasting 10 h");
    expect(reportText(p)).toBe("Reports in 24 h");
    expect(audienceText(p)).toBe("Women · Adults (18+)");
    expect(includedPreview(p)).toBe("CBC, TSH");
  });

  it("keeps working for packages synced before the details existed", () => {
    const p = toHealthPackage(row());
    expect(p.category).toBeNull();
    expect(fastingText(p)).toBe("No fasting");
    expect(reportText(p)).toBeNull();
    expect(audienceText(p)).toBeNull();
    expect(p.includedTests).toEqual([]);
    expect(p.testsCount).toBe(3);
  });

  it("drops a package whose lab is missing", () => {
    expect(toHealthPackage(row({ diagnostic_centers: null })).lab).toBeNull();
  });
});

describe("package lists", () => {
  const a = toHealthPackage(row({ id: "a", price: 500, tests_count: 10, category: "diabetes" }));
  const b = toHealthPackage(row({ id: "b", price: 1500, tests_count: 60, category: "full_body", is_popular: true }));

  it("offers chips only for categories that have packages, in the standard order", () => {
    expect(categoriesWithPackages([a, b]).map((c) => c.value)).toEqual(["full_body", "diabetes"]);
  });

  it("sorts by price, tests, or popularity", () => {
    expect(sortPackages([b, a], "price_low").map((p) => p.id)).toEqual(["a", "b"]);
    expect(sortPackages([a, b], "most_tests").map((p) => p.id)).toEqual(["b", "a"]);
    expect(sortPackages([a, b], "popular")[0].id).toBe("b");
  });

  it("groups included tests by category, biggest group first", () => {
    expect(groupIncludedTests([
      { name: "SGPT", category: "Liver" }, { name: "SGOT", category: "Liver" }, { name: "TSH", category: "Thyroid" },
    ])).toEqual([{ group: "Liver", tests: ["SGOT", "SGPT"] }, { group: "Thyroid", tests: ["TSH"] }]);
  });

  it("shows readable group names instead of raw category codes", () => {
    expect(prettyGroupName("molecular-diagnostics")).toBe("Molecular diagnostics");
    expect(prettyGroupName("LIVER_FUNCTION")).toBe("Liver function");
    expect(prettyGroupName("Thyroid Profile")).toBe("Thyroid Profile");
    expect(prettyGroupName(null)).toBe("Other tests");
  });
});
