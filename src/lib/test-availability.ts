export type TestAvailabilityType = "GENERAL" | "SPECIALIZED";

export interface TestAvailabilityMetadata {
  availabilityType?: string | null;
  availableDays?: string[] | null;
}

const DAY_ALIASES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

export const normalizeAvailabilityType = (value?: string | null): TestAvailabilityType => {
  const normalized = value
    ?.trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  return normalized === "SPECIALIZED" ||
    normalized === "SPECIALIZEDTEST" ||
    normalized === "SPECIALISED" ||
    normalized === "SPECIALISEDTEST"
    ? "SPECIALIZED"
    : "GENERAL";
};

export const normalizeAvailableDays = (days?: string[] | null): number[] => {
  if (!Array.isArray(days)) return [];
  return Array.from(
    new Set(
      days
        .map((day) => DAY_ALIASES[String(day).trim().toLowerCase()])
        .filter((day): day is number => day !== undefined)
    )
  ).sort((a, b) => a - b);
};

export const getCommonSpecializedDays = (items: TestAvailabilityMetadata[]): number[] | null => {
  const specialized = items.filter(
    (item) => normalizeAvailabilityType(item.availabilityType) === "SPECIALIZED"
  );
  if (specialized.length === 0) return null;

  return specialized
    .map((item) => normalizeAvailableDays(item.availableDays))
    .reduce<number[]>((common, days, index) =>
      index === 0 ? days : common.filter((day) => days.includes(day)), []);
};

export const formatAvailableDays = (days?: string[] | null): string => {
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return normalizeAvailableDays(days).map((day) => labels[day]).join(", ");
};