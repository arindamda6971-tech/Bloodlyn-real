import { testNameParts } from "@/utils/simplify-test-name";

/**
 * The tests patients book most, most-booked kinds first, so a lab's list doesn't
 * open on rare tests. This only sets the order; a wrong guess can't hide a test.
 */
const COMMON_TESTS: RegExp[] = [
  /blood count|\bcbc\b|ha?emogram/i,
  /^glucose\b(?!-)|blood sugar|\b(fbs|ppbs|rbs)\b/i,
  /hba1c|hemoglobin a1c|glycated/i,
  /lipid|cholesterol/i,
  /thyroid|thyrotropin|\b(tsh|t3|t4)\b/i,
  /liver (function|panel)|\blft\b/i,
  /kidney function|renal|\b(kft|rft)\b/i,
  /hydroxyvitamin d|vitamin d/i,
  /vitamin b.?12|cobalamin/i,
  /\bsgpt\b|alanine amino/i,
  /\bsgot\b|aspartate amino/i,
  /bilirubin/i,
  /creatinine/i,
  /\burea\b/i,
  /uric acid|\burate\b/i,
  /urine (routine|r\/?m|exam)/i,
  /\besr\b|sedimentation/i,
  /c.?reactive|\bcrp\b/i,
  /ferritin|\biron\b/i,
  /calcium/i,
  /dengue|malaria|typhoid|widal/i,
];

const rankCache = new Map<string, number>();

const commonRank = (name: string) => {
  let rank = rankCache.get(name);
  if (rank === undefined) {
    const index = COMMON_TESTS.findIndex((pattern) => pattern.test(name));
    rank = index === -1 ? COMMON_TESTS.length : index;
    rankCache.set(name, rank);
  }
  return rank;
};

/** Names starting with a number, like "1-Methylhistidine", go after the A to Z. */
const alphabetical = (a: string, b: string) => {
  const aNumber = /^[^a-z]/i.test(a);
  const bNumber = /^[^a-z]/i.test(b);
  if (aNumber !== bNumber) return aNumber ? 1 : -1;
  return a.localeCompare(b);
};

/** The lab's Popular tests, then common tests, then everything else A to Z. */
export function commonTestsFirst<T extends { name: string; popular?: boolean }>(tests: T[]): T[] {
  return [...tests].sort((a, b) =>
    Number(!!b.popular) - Number(!!a.popular) ||
    commonRank(a.name) - commonRank(b.name) ||
    alphabetical(testNameParts(a.name).title, testNameParts(b.name).title),
  );
}
