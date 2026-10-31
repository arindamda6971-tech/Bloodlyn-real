import { describe, expect, it, vi } from "vitest";
import { searchCatalogue, type CatalogueTest } from "@/lib/test-catalogue";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const test = (test_name: string, category = "clinical-chemistry", loinc_code?: string): CatalogueTest => ({
  id: test_name, test_name, category, price: 0, collection_fee: 0, report_delivery_time: "", status: "active", loinc_code,
});

describe("searching the catalogue on the device", () => {
  const tests = [test("Glucose Fasting, Fluoride Plasma"), test("HbA1c, EDTA Blood", "diabetes"), test("Zinc, Serum", "minerals", "5763-8")];

  it("matches any part of a name, ignoring case", () => {
    expect(searchCatalogue(tests, "GLUCOSE FAST").map((t) => t.test_name)).toEqual(["Glucose Fasting, Fluoride Plasma"]);
    expect(searchCatalogue(tests, "a1c")).toHaveLength(1);
  });

  it("finds a test by its code, as the bridge does", () => {
    expect(searchCatalogue(tests, "5763")[0].test_name).toBe("Zinc, Serum");
  });

  it("stays inside a category", () => {
    expect(searchCatalogue(tests, "e", "diabetes").map((t) => t.test_name)).toEqual(["HbA1c, EDTA Blood"]);
  });

  it("finds nothing for an empty term or an unknown test", () => {
    expect(searchCatalogue(tests, "  ")).toEqual([]);
    expect(searchCatalogue(tests, "unknown")).toEqual([]);
  });

  it("caps each term, as the bridge does", () => {
    const many = Array.from({ length: 60 }, (_, i) => test(`Glucose ${i}`));
    expect(searchCatalogue(many, "glucose")).toHaveLength(40);
  });
});
