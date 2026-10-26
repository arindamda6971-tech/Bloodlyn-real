import { simplifyTestName } from "@/utils/simplify-test-name";

export interface TestDisplayName {
  title: string;
  /** Sample type shown as a small tag, e.g. "Fluoride Plasma", "Serum", "Urine 24 Hrs". */
  specimen: string | null;
}

const SPECIMEN_HINT =
  /\b(serum|plasma|blood|urine|csf|fluid|stool|swab|tissue|sputum|semen|saliva|hrs|marrow|biopsy|smear|aspirate|edta|citrate|heparin|dbs|hair|nail)\b/i;

const cache = new Map<string, TestDisplayName>();

/**
 * Splits a catalogue name into a clean title and its sample type:
 * "Glucose Fasting, Fluoride Plasma" → { title: "Glucose Fasting", specimen: "Fluoride Plasma" }.
 * Also drops the trailing "*"/"**" lab footnote markers.
 */
export function getTestDisplayName(name: string | null | undefined): TestDisplayName {
  const raw = (name || "").trim();
  const cached = cache.get(raw);
  if (cached) return cached;

  const cleaned = simplifyTestName(raw.replace(/\s+/g, " ").replace(/\*+$/g, "").trim()) || raw;
  let result: TestDisplayName = { title: cleaned, specimen: null };

  const comma = cleaned.lastIndexOf(", ");
  if (comma > 2) {
    const tail = cleaned.slice(comma + 2).trim();
    if (tail.length <= 32 && SPECIMEN_HINT.test(tail)) {
      result = { title: cleaned.slice(0, comma).trim(), specimen: tail.replace(/\*+$/g, "") };
    }
  }

  cache.set(raw, result);
  return result;
}

/**
 * Indian digit grouping ("3,450", "1,04,800") without Intl. The first
 * toLocaleString("en-IN") in a session loads locale data — measured ~60 ms on a
 * 6x-throttled phone profile, right as Explore opened.
 */
export function formatCount(n: number): string {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  return `${s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${s.slice(-3)}`;
}
