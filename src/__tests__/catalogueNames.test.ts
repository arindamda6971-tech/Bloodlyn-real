import { describe, expect, it } from "vitest";
import { clinicalNameAddsDetail, simplifyTestName, testNameKey, testSample } from "@/utils/simplify-test-name";
import { sampleFromTestName } from "@/utils/sample-type";
import { rankTests, understandQuery } from "@/utils/search-intelligence";

// Names as the Admin test list has them since 14 Nov 2026 (851 of 1,131 in capitals).
describe("all-capital catalogue names", () => {
  it("reads like a name, keeping abbreviations", () => {
    expect(simplifyTestName("ERYTHROCYTE SEDIMENTATION RATE")).toBe("Erythrocyte Sedimentation Rate");
    expect(simplifyTestName("HBA1C (GLYCOCYLATED HAEMOGLOBIN)")).toBe("HbA1c (Glycocylated Haemoglobin)");
    expect(simplifyTestName("ANTI NUCLEAR ANTIBODY / FACTOR (ANA/ANF), EIA")).toBe("Anti Nuclear Antibody / Factor (ANA/ANF), EIA");
    expect(simplifyTestName("FREE T3  & FREE T4")).toBe("Free T3 & Free T4");
    expect(simplifyTestName("CHIKUNGUNYA VIRUS ANTIBODY IGM")).toBe("Chikungunya Virus Antibody IgM");
    expect(simplifyTestName("RED CELL DISTRIBUTION WIDTH (RDW)")).toBe("Red Cell Distribution Width (RDW)");
    expect(simplifyTestName("NT-PROBNP")).toBe("NT-proBNP");
    expect(simplifyTestName("FACTOR VIII")).toBe("Factor VIII");
    expect(simplifyTestName("0.5 HR AFTER 75 GM GLUCOSE")).toBe("0.5 hr after 75 gm Glucose");
    expect(simplifyTestName("HOMOCYSTEINE QUANTITATIVE, SERUM")).toBe("Homocysteine Quantitative — Serum");
  });

  it("leaves mixed-case names as they are", () => {
    expect(simplifyTestName("Lipid Profile")).toBe("Lipid Profile");
    expect(simplifyTestName("4H syndrome gene panel")).toBe("4H syndrome gene panel");
  });

  it("names a panel by its first line and keeps what it includes as the clinical name", () => {
    const panel = "ANTENATAL  PANEL 1\r\n*Complete Blood Count *Blood Group + Rh Factor *Urine R/E";
    expect(simplifyTestName(panel)).toBe("Antenatal Panel 1");
    // The detail page still shows the full name, with the sub-tests.
    expect(clinicalNameAddsDetail(panel)).toBe(true);
    // A plain capital name doesn't get a repeated second line.
    expect(clinicalNameAddsDetail("ERYTHROCYTE SEDIMENTATION RATE")).toBe(false);
  });
});

describe("a lab's sample that can't be right", () => {
  it("shows what the test is done on instead", () => {
    expect(testSample("COMPLETE BLOOD COUNT", "Urine")).toBe("Blood");
    expect(testSample("HAEMOGLOBIN", "Swab")).toBe("Blood");
    expect(testSample("URINE R/E", "Blood")).toBe("Urine");
  });

  it("still lets the lab decide when the name isn't clear", () => {
    expect(testSample("CREATININE", "Urine")).toBe("Urine");
    expect(testSample("(ALDH3A2) Gene Panel by NGS, EDTA Blood**", "Sputum")).toBe("Sputum");
    expect(testSample("HAEMOGLOBIN", "Other")).toBe("Other");
    expect(testSample("COMPLETE BLOOD COUNT", "Blood")).toBe("Blood");
  });

  it("only guesses from names that are clear", () => {
    expect(sampleFromTestName("Stool for Occult Blood")).toBe("Stool");
    expect(sampleFromTestName("Immunohistochemistry, Prostate Specific Antigen (PSA)")).toBeNull();
  });
});

describe("tests listed twice", () => {
  it("share one name key", () => {
    expect(testNameKey("LIPID PROFILE  SCREEN")).toBe(testNameKey("Lipid Profile Screen"));
  });

  it("show once in search results", () => {
    const tests = [
      { id: "a", test_name: "LIPID PROFILE SCREEN" },
      { id: "b", test_name: "LIPID PROFILE SCREEN" },
      { id: "c", test_name: "LIPID PROFILE" },
    ];
    const names = rankTests(tests, understandQuery("lipid profile")).map((t) => t.id);
    expect(names).toContain("a");
    expect(names).not.toContain("b");
    expect(names).toContain("c");
  });
});
