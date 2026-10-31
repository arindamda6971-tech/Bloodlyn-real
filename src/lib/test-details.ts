import { normalizeAvailabilityType, normalizeAvailableDays } from "@/lib/test-availability";

/**
 * How a lab's test details read to patients, decided once so every screen agrees.
 * Two kinds of fact, never mixed:
 * - requirements: what the patient must do, which can stop or spoil a booking
 * - info: what's useful to know
 */
export interface TestDetails {
  availabilityType?: string | null;
  availableDays?: string[] | null;
  sampleType?: string | null;
  preparationRequired?: boolean | null;
  preparationInstruction?: string | null;
  fastingRequired?: boolean | null;
  fastingInstruction?: string | null;
  reportType?: string | null;
  reportTime?: string | null;
  prescriptionRequired?: boolean | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Fri, Sat", in week order starting Monday. */
export function shortAvailableDays(days?: string[] | null): string {
  return normalizeAvailableDays(days)
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((day) => DAY_NAMES[day])
    .join(", ");
}

/** Labs store NABL or NORMAL; patients shouldn't see those codes. */
export function reportTypeLabel(reportType?: string | null): string | null {
  const type = reportType?.trim();
  if (!type) return null;
  if (type.toUpperCase() === "NABL") return "NABL report";
  if (type.toUpperCase() === "NORMAL") return "Lab report";
  return type;
}

/** Labs store hours as a number ("24") or days as text ("3 days"). */
export function reportTimeLabel(reportTime?: string | null): string | null {
  const time = reportTime?.trim();
  if (!time) return null;
  if (!/^\d+(\.\d+)?$/.test(time)) return `Report in ${time}`;
  return `Report in ${time} ${Number(time) === 1 ? "hour" : "hours"}`;
}

/**
 * What the patient must do. With showsInstructions, the lab's own words are on
 * screen too, so a requirement already spelled out there isn't repeated.
 */
export function testRequirements(test: TestDetails, showsInstructions = false): string[] {
  const instructions = testInstructions(test);
  const spelledOut = (label: string) => showsInstructions && instructions.some((item) => item.label === label);
  return [
    test.prescriptionRequired ? "Prescription required" : null,
    test.fastingRequired && !spelledOut("Fasting") ? "Fasting needed" : null,
    test.preparationRequired && !spelledOut("Preparation") ? "Preparation needed" : null,
  ].filter((item): item is string => !!item);
}

/** Useful to know: test days (only if limited), sample, report type and when it's ready. */
export function testInfo(test: TestDetails): string[] {
  const limited = normalizeAvailabilityType(test.availabilityType) === "SPECIALIZED";
  return [
    limited ? shortAvailableDays(test.availableDays) || "Schedule unavailable" : null,
    test.sampleType?.trim() || null,
    reportTypeLabel(test.reportType),
    reportTimeLabel(test.reportTime),
  ].filter((item): item is string => !!item);
}

/** The lab's own instructions, for when the patient is about to act on them. */
export function testInstructions(test: TestDetails): { label: string; text: string }[] {
  const items: { label: string; text: string }[] = [];
  const fasting = test.fastingInstruction?.trim();
  const preparation = test.preparationInstruction?.trim();
  if (test.fastingRequired && fasting) items.push({ label: "Fasting", text: fasting });
  if (test.preparationRequired && preparation) items.push({ label: "Preparation", text: preparation });
  return items;
}
