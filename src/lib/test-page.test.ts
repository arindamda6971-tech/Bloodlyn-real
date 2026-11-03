import { describe, expect, it } from "vitest";
import { beforeYouBook, plainSample, reportTimeValue, testFacts } from "@/lib/test-page";

describe("test page", () => {
  it("reads report times the way labs type them", () => {
    expect(reportTimeValue("24")).toBe("24 h");
    expect(reportTimeValue("12 hours")).toBe("12 h");
    expect(reportTimeValue("48")).toBe("2 days");
    expect(reportTimeValue("36")).toBe("36 h");
    expect(reportTimeValue("3 days")).toBe("3 days");
    expect(reportTimeValue(" ")).toBeNull();
    expect(reportTimeValue("0")).toBeNull();
  });

  it("names the sample in plain words", () => {
    expect(plainSample("CBC", "EDTA Blood")).toBe("Blood");
    expect(plainSample("Urine Routine", "urine")).toBe("Urine");
    expect(plainSample("Glucose, Fasting", null)).toBeNull();
  });

  it("shows only facts the lab gave, with nothing made up", () => {
    expect(testFacts({ name: "Acid Phosphatase" })).toEqual([]);
    const facts = testFacts({
      name: "Lipid Profile",
      fastingRequired: true,
      fastingHours: 10,
      reportTime: "24",
      sampleType: "Serum",
      availabilityType: "SPECIALIZED",
      availableDays: ["friday", "saturday"],
      reportType: "NABL",
    });
    expect(facts.map((f) => `${f.label}: ${f.value}`)).toEqual([
      "Preparation: Fasting 10 h",
      "Reports in: 24 h",
      "Sample: Blood",
      "Test days: Fri, Sat",
      "Report: NABL report",
    ]);
  });

  it("uses the lab's own words before booking, and invents none", () => {
    expect(beforeYouBook({ name: "TSH" })).toEqual([]);
    expect(
      beforeYouBook({
        name: "Lipid Profile",
        fastingRequired: true,
        fastingInstruction: "Fast 10-12 hours, water allowed",
        preparationRequired: true,
        preparationInstruction: "Avoid alcohol for 24 hours",
        prescriptionRequired: true,
      }).map((n) => n.text)
    ).toEqual([
      "You need a doctor's prescription for this test.",
      "Fast 10-12 hours, water allowed",
      "Avoid alcohol for 24 hours",
    ]);
    expect(beforeYouBook({ name: "CBC", fastingRequired: false, preparationRequired: false })[0].text).toMatch(/No fasting/);
  });
});
