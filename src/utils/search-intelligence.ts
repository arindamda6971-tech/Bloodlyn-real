import { MEDICAL_TEST_DICTIONARY, matchToDictionary } from "@/lib/medical-dictionary";

export interface SearchResult {
  id: string;
  name: string;
  price: number;
  discount_percent?: number;
  matchScore: number;
  isDictionaryMatch: boolean;
}

/**
 * Intelligent search that combines direct name matching with medical dictionary aliases.
 */
export function intelligentSearch(
  query: string,
  testPool: any[],
  limit = 5
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];
  const seenIds = new Set<string>();

  // 1. Try to find a medical dictionary match for the intent
  const dictMatch = matchToDictionary(q, 0.4); // lower threshold for broad intent
  const canonical = dictMatch?.canonical.toLowerCase();
  const dictConfidence = dictMatch?.confidencePct ?? 0;

  // 2. Score and filter the test pool
  for (let i = 0; i < testPool.length; i++) {
    const test = testPool[i];
    if (!test || seenIds.has(test.id)) continue;

    const testName = (test.name || test.test_name || "").toLowerCase();
    let score = 0;
    let isDictMatch = false;

    // Direct match (highest weight)
    if (testName === q) {
      score = 100;
    } else if (testName.startsWith(q)) {
      score = 90;
    } else if (testName.includes(q)) {
      score = 80;
    }

    // Dictionary intent match
    if (canonical && (testName.includes(canonical) || canonical.includes(testName))) {
      score = Math.max(score, dictConfidence);
      isDictMatch = true;
    }

    if (score > 40) {
      results.push({
        id: test.id,
        name: test.name || test.test_name,
        price: test.price,
        discount_percent: test.discount_percent,
        matchScore: score,
        isDictionaryMatch: isDictMatch,
      });
      seenIds.add(test.id);
    }
  }

  // Sort by score and return limited results
  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}
