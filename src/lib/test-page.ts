import { normalizeAvailabilityType } from "@/lib/test-availability";
import { reportTypeLabel, shortAvailableDays, type TestDetails } from "@/lib/test-details";
import { testSample } from "@/utils/simplify-test-name";

/**
 * What the test page shows, built only from what the lab (or the catalogue)
 * wrote. A fact with nothing behind it is left out instead of filled in.
 */
export interface TestPageData extends TestDetails {
  name: string;
  fastingHours?: number | null;
  /** The catalogue's free-text "before the test" note. */
  prerequisites?: string | null;
}

export type TestFactKey = "preparation" | "report" | "sample" | "days" | "reportType";

/** "24" → "24 h", "48" → "2 days", "3 days" stays as written. */
export function reportTimeValue(reportTime?: string | null): string | null {
  const time = reportTime?.trim();
  if (!time) return null;
  const hours = /^(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)?$/i.exec(time);
  if (!hours) return time;
  const n = Number(hours[1]);
  if (!(n > 0)) return null;
  if (n < 24 || n % 24 !== 0) return `${n} h`;
  return n === 24 ? "24 h" : `${n / 24} days`;
}

/** The sample in plain words: tube names ("EDTA Blood", "Serum") are all blood to a patient. */
export function plainSample(name: string, sampleType?: string | null): string | null {
  const sample = testSample(name, sampleType)?.trim();
  if (!sample) return null;
  if (/urine/i.test(sample) && /blood|serum|plasma/i.test(sample)) return "Blood & urine";
  if (/blood|serum|plasma|edta|fluoride|citrate/i.test(sample)) return "Blood";
  return sample.charAt(0).toUpperCase() + sample.slice(1);
}

export function testFacts(test: TestPageData): { key: TestFactKey; label: string; value: string }[] {
  const facts: { key: TestFactKey; label: string; value: string }[] = [];
  if (test.fastingRequired === true) {
    facts.push({ key: "preparation", label: "Preparation", value: test.fastingHours ? `Fasting ${test.fastingHours} h` : "Fasting needed" });
  } else if (test.fastingRequired === false) {
    facts.push({ key: "preparation", label: "Preparation", value: test.preparationRequired ? "Some preparation" : "No fasting" });
  }
  const report = reportTimeValue(test.reportTime);
  if (report) facts.push({ key: "report", label: "Reports in", value: report });
  const sample = plainSample(test.name, test.sampleType);
  if (sample) facts.push({ key: "sample", label: "Sample", value: sample });
  if (normalizeAvailabilityType(test.availabilityType) === "SPECIALIZED") {
    const days = shortAvailableDays(test.availableDays);
    if (days) facts.push({ key: "days", label: "Test days", value: days });
  }
  const type = reportTypeLabel(test.reportType);
  if (type) facts.push({ key: "reportType", label: "Report", value: type });
  return facts;
}

/** The "Before you book" notes, in the lab's own words where it wrote any. */
export function beforeYouBook(test: TestPageData): { key: string; text: string }[] {
  const notes: { key: string; text: string }[] = [];
  if (test.prescriptionRequired) notes.push({ key: "prescription", text: "You need a doctor's prescription for this test." });

  const fasting = test.fastingInstruction?.trim();
  if (test.fastingRequired && fasting) notes.push({ key: "fasting", text: fasting });
  else if (test.fastingRequired) {
    notes.push({
      key: "fasting",
      text: test.fastingHours
        ? `Don't eat for ${test.fastingHours} hours before the sample. Water is fine.`
        : "Fasting is needed before the sample. The lab will confirm how long.",
    });
  } else if (test.fastingRequired === false && !test.preparationRequired) {
    notes.push({ key: "fasting", text: "No fasting needed. You can eat and drink as usual." });
  }

  const preparation = test.preparationInstruction?.trim();
  if (test.preparationRequired && preparation) notes.push({ key: "preparation", text: preparation });

  const prerequisites = test.prerequisites?.trim();
  if (prerequisites && !notes.some((n) => n.text === prerequisites)) notes.push({ key: "prerequisites", text: prerequisites });
  return notes;
}
