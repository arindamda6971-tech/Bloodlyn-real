import { describe, expect, it } from "vitest";
import { clinicalNameAddsDetail, simplifyTestName, testNameParts, testSample } from "@/utils/simplify-test-name";
import { PATIENT_TEST_NAMES } from "@/data/patientTestNames";
import { formatTestsLabel } from "@/lib/format-tests";
import { commonTestsFirst } from "@/lib/test-order";

describe("patient-facing test names", () => {
  it("takes the coding-system parts out of a name", () => {
    expect(testNameParts("25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Moles/volume] in Serum or Plasma")).toEqual({
      title: "25-Hydroxyvitamin D3+25-Hydroxyvitamin D2",
      specimen: "Serum/Plasma",
    });
    expect(testNameParts("1-deoxymethylsphinganine [Mass/volume] in Serum by LC/MS/MS")).toEqual({
      title: "1-deoxymethylsphinganine",
      specimen: "Serum",
    });
  });

  it("removes catalogue markers and moves the sample out", () => {
    expect(testNameParts("(ALDH3A2) Gene Panel by NGS, EDTA Blood** (E9X9V)*")).toEqual({
      title: "(ALDH3A2) Gene Panel by NGS",
      specimen: "EDTA Blood",
    });
    expect(testNameParts("3-Methyl Histidine - Quantitative, EDTA Plasma**")).toEqual({
      title: "3-Methyl Histidine - Quantitative",
      specimen: "EDTA Plasma",
    });
  });

  it("leaves names that are already plain alone", () => {
    for (const name of ["4H syndrome gene panel", "1p/19q Co-Deletion"]) {
      expect(testNameParts(name)).toEqual({ title: name, specimen: "" });
    }
  });

  it("keeps fasting in the name, so two tests don't read the same", () => {
    expect(testNameParts("Glucose [Mass/volume] in Serum or Plasma --fasting").title).toBe("Glucose (Fasting)");
    expect(testNameParts("Glucose [Mass/volume] in Serum or Plasma").title).toBe("Glucose");
  });

  it("doesn't turn a ratio into a different test", () => {
    expect(simplifyTestName("Albumin/Globulin [Mass Ratio] in Serum or Plasma")).toBe("Albumin/Globulin — Serum/Plasma");
    expect(simplifyTestName("Hemoglobin A1c/Hemoglobin.total [Molar ratio] in Blood by IFCC protocol")).toBe("Hemoglobin A1c — Blood");
  });

  it("lets the name narrow down a blood sample, but never overrule the lab", () => {
    const name = "1-Methylhistidine [Units/volume] in Serum or Plasma";
    expect(testSample(name, "Blood")).toBe("Serum/Plasma");
    expect(testSample(name, null)).toBe("Serum/Plasma");
    expect(testSample("(ALDH3A2) Gene Panel by NGS, EDTA Blood**", "Sputum")).toBe("Sputum");
    expect(testSample("2D Echocardiogram", null)).toBeUndefined();
  });

  it("only offers the clinical name when it says something more", () => {
    expect(clinicalNameAddsDetail("3-Methyl Histidine - Quantitative, EDTA Plasma**")).toBe(false);
    expect(clinicalNameAddsDetail("4H syndrome gene panel")).toBe(false);
    expect(clinicalNameAddsDetail("Glucose [Mass/volume] in Serum or Plasma --fasting")).toBe(true);
    expect(clinicalNameAddsDetail("Hemoglobin A1c/Hemoglobin.total [Molar ratio] in Blood by IFCC protocol")).toBe(true);
  });

  it("keeps a lab's own words in brackets", () => {
    expect(simplifyTestName("CBC [Complete Blood Count]")).toBe("CBC [Complete Blood Count]");
  });

  it("uses the same names in order lists", () => {
    expect(formatTestsLabel(["Carboxyhemoglobin [Mass/volume] in Blood", "CBC"])).toBe("Carboxyhemoglobin — Blood + 1 more");
    expect(formatTestsLabel([], "Lab Test")).toBe("Lab Test");
  });
});

describe("easy names for common tests", () => {
  it("shows the plain name and keeps the sample apart", () => {
    expect(testNameParts("Glucose Fasting, Fluoride Plasma").title).toBe("Fasting Blood Sugar");
    expect(simplifyTestName("Glucose Fasting, Fluoride Plasma")).toBe("Fasting Blood Sugar");
    expect(testNameParts("SGPT (ALT), Serum")).toEqual({ title: "SGPT (ALT) Liver Test", specimen: "Serum" });
  });

  it("matches a catalogue name that holds a line break", () => {
    expect(simplifyTestName("TSH (Thyroid Stimulating Hormone)\n- Ultrasensitive, Serum")).toBe("TSH (Thyroid Test)");
  });

  it("offers the clinical name under an easy name", () => {
    expect(clinicalNameAddsDetail("Glucose Fasting, Fluoride Plasma")).toBe(true);
  });

  it("gives every test its own name, so the cart can't merge two", () => {
    const names = Object.values(PATIENT_TEST_NAMES).map((name) => name.toLowerCase());
    expect(names).toHaveLength(145);
    expect(new Set(names).size).toBe(145);
  });
});

describe("test list order", () => {
  const names = (list: { name: string }[]) => list.map((test) => test.name);

  it("puts common tests above rare ones and numbered names last", () => {
    expect(names(commonTestsFirst([
      { name: "1-Methylhistidine [Units/volume] in Serum or Plasma" },
      { name: "Zinc, Serum" },
      { name: "Lipid Profile" },
      { name: "25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Moles/volume] in Serum or Plasma" },
      { name: "Glucose Fasting, Fluoride Plasma" },
      { name: "Aldolase, Serum" },
    ]))).toEqual([
      "Glucose Fasting, Fluoride Plasma",
      "Lipid Profile",
      "25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Moles/volume] in Serum or Plasma",
      "Aldolase, Serum",
      "Zinc, Serum",
      "1-Methylhistidine [Units/volume] in Serum or Plasma",
    ]);
  });

  it("doesn't count an enzyme with glucose in its name as a sugar test", () => {
    expect(names(commonTestsFirst([{ name: "Glucose-6-Phosphate Dehydrogenase" }, { name: "Glucose, Serum" }]))[0]).toBe("Glucose, Serum");
  });

  it("keeps a lab's Popular tests on top and leaves the input as it was", () => {
    const tests = [{ name: "Lipid Profile" }, { name: "Zinc, Serum", popular: true }];
    expect(names(commonTestsFirst(tests))).toEqual(["Zinc, Serum", "Lipid Profile"]);
    expect(names(tests)).toEqual(["Lipid Profile", "Zinc, Serum"]);
  });
});
