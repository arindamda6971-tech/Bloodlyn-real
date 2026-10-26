import { describe, it, expect } from "vitest";
import {
  buildTestSearchIndex,
  buildTestSearchIndexInBackground,
  normalizeSearchText,
  searchTests,
} from "@/lib/test-search";
import { getTestDisplayName } from "@/lib/test-display";

// Real names from the Admin catalogue.
const NAMES: [string, string][] = [
  ["Glucose Fasting, Fluoride Plasma", "clinical-chemistry"],
  ["Glucose Random, Fluoride Plasma", "clinical-chemistry"],
  ["Glucose Post Prandial, Fluoride Plasma", "clinical-chemistry"],
  ["Glucose, Urine", "urine-stool-body-fluids"],
  ["HbA1c- Glycated Haemoglobin, EDTA Blood", "hematology"],
  ["GTT (Glucose Tolerance Test) Profile - 2 Hrs (75 grams glucose)", "clinical-chemistry"],
  ["Canine - Glucose Fasting, Fluoride Plasma", "clinical-chemistry"],
  ["Insulin - Fasting, Serum", "hormones-endocrinology"],
  ["TSH (Ultrasensitive), Serum", "hormones-endocrinology"],
  ["Thyroid Profile - 1", "hormones-endocrinology"],
  ["T3 (Total Tri Iodothyronine), Serum", "hormones-endocrinology"],
  ["CBC Haemogram, EDTA Blood", "hematology"],
  ["Haemoglobin (Hb)", "hematology"],
  ["Ferritin, Serum", "clinical-chemistry"],
  ["Lipid Profile, Serum", "clinical-chemistry"],
  ["Cholesterol Total, Serum", "clinical-chemistry"],
  ["APA Phospholipid - IgG antibody, Serum", "serology-immunology"],
  ["Widal Test for Typhoid, Serum", "serology-immunology"],
  ["Dengue NS1 Antigen, Serum", "infectious-disease"],
  ["Malaria Parasite Detection by Smear Examination", "infectious-disease"],
  ["Vitamin D Total - 25 Hydroxy (OH) , Serum", "vitamins-nutrition"],
  ["Vitamin B12 (Cyanocobalamin), Serum", "vitamins-nutrition"],
  ["Bilirubin Total, Serum", "clinical-chemistry"],
  ["Creatinine, Serum", "clinical-chemistry"],
  ["Uric Acid, Serum", "clinical-chemistry"],
  ["Allergy Panel - Common Food", "allergy"],
];

const tests = NAMES.map(([test_name, category], i) => ({ id: String(i), test_name, category, display_name: test_name }));
const index = buildTestSearchIndex(tests);
const names = (q: string, category?: string) => searchTests(index, q, { category }).results.map((t) => t.test_name);

describe("searchTests", () => {
  it("understands 'blood sugar' as glucose tests, best matches first", () => {
    const r = searchTests(index, "blood sugar");
    expect(r.concepts).toContain("Blood sugar & diabetes");
    const found = r.results.map((t) => t.test_name);
    expect(found.slice(0, 3)).toEqual([
      "Glucose Fasting, Fluoride Plasma",
      "Glucose Random, Fluoride Plasma",
      "Glucose Post Prandial, Fluoride Plasma",
    ]);
    expect(found).toContain("HbA1c- Glycated Haemoglobin, EDTA Blood");
    expect(found).toContain("GTT (Glucose Tolerance Test) Profile - 2 Hrs (75 grams glucose)");
    // Veterinary tests sink below every human glucose test.
    expect(found.indexOf("Canine - Glucose Fasting, Fluoride Plasma")).toBeGreaterThan(found.indexOf("Glucose, Urine"));
    expect(found).not.toContain("Lipid Profile, Serum");
  });

  it("uses extra words to refine a concept", () => {
    expect(names("fasting sugar")[0]).toBe("Glucose Fasting, Fluoride Plasma");
    expect(names("sugar urine")[0]).toBe("Glucose, Urine");
  });

  it("corrects typos and reports them", () => {
    const r = searchTests(index, "thyrod");
    expect(r.corrections).toEqual([{ from: "thyrod", to: "thyroid" }]);
    expect(r.results.map((t) => t.test_name)).toEqual(
      expect.arrayContaining(["Thyroid Profile - 1", "TSH (Ultrasensitive), Serum", "T3 (Total Tri Iodothyronine), Serum"]),
    );
    // Common misspellings are known outright, so they need no correction notice.
    expect(names("thyriod")).toContain("TSH (Ultrasensitive), Serum");
    expect(names("cholestrol")[0]).toBe("Lipid Profile, Serum");
    expect(searchTests(index, "bilirubn").corrections).toEqual([{ from: "bilirubn", to: "bilirubin" }]);
  });

  it("maps symptoms, abbreviations and Indian-language words to tests", () => {
    expect(names("fever")).toEqual(
      expect.arrayContaining(["Widal Test for Typhoid, Serum", "Dengue NS1 Antigen, Serum", "CBC Haemogram, EDTA Blood"]),
    );
    expect(names("cbc")[0]).toBe("CBC Haemogram, EDTA Blood");
    expect(names("hemoglobin")).toContain("Haemoglobin (Hb)");
    expect(names("সুগার")[0]).toBe("Glucose Fasting, Fluoride Plasma");
    expect(names("बुखार")).toContain("Widal Test for Typhoid, Serum");
    expect(names("vit d")[0]).toBe("Vitamin D Total - 25 Hydroxy (OH) , Serum");
  });

  it("keeps word boundaries: 'lipid' does not match 'phospholipid'", () => {
    const found = names("lipid");
    expect(found[0]).toBe("Lipid Profile, Serum");
    expect(found).not.toContain("APA Phospholipid - IgG antibody, Serum");
  });

  it("matches partial words while typing and searches within a category", () => {
    expect(names("gluc")).toContain("Glucose Fasting, Fluoride Plasma");
    expect(names("bilir")).toEqual(["Bilirubin Total, Serum"]);
    expect(names("glucose", "urine-stool-body-fluids")).toEqual(["Glucose, Urine"]);
  });

  it("builds the same index in small idle slices as in one go", async () => {
    const copy = tests.slice();
    const sliced = await buildTestSearchIndexInBackground(copy, 4);
    expect(searchTests(sliced, "blood sugar").results.map((t) => t.id)).toEqual(
      searchTests(index, "blood sugar").results.map((t) => t.id),
    );
    // Cached: asking again returns the very same index.
    expect(await buildTestSearchIndexInBackground(copy)).toBe(sliced);
  });

  it("returns nothing for nonsense instead of everything", () => {
    expect(names("zzqx")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });
});

describe("normalizeSearchText", () => {
  it("folds British spellings symmetrically", () => {
    expect(normalizeSearchText("Haemoglobin")).toBe("hemoglobin");
    expect(normalizeSearchText("Oestradiol")).toBe("estradiol");
  });
});

describe("getTestDisplayName", () => {
  it("splits the sample type off and drops footnote stars", () => {
    expect(getTestDisplayName("Glucose Fasting, Fluoride Plasma")).toEqual({ title: "Glucose Fasting", specimen: "Fluoride Plasma" });
    expect(getTestDisplayName("Hemoglobin, Citrated Plasma**")).toEqual({ title: "Hemoglobin", specimen: "Citrated Plasma" });
    expect(getTestDisplayName("Thyroid Profile - 1")).toEqual({ title: "Thyroid Profile - 1", specimen: null });
  });
});
