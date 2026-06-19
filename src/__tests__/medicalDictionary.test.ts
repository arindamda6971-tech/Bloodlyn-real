import { describe, it, expect } from "vitest";
import { matchToDictionary } from "@/lib/medical-dictionary";

describe("matchToDictionary — abbreviation-aware + confidence", () => {
  it("returns 100% on exact alias", () => {
    const m = matchToDictionary("CBC");
    expect(m?.canonical).toBe("Complete Blood Count");
    expect(m?.confidencePct).toBe(100);
    expect(m?.matchType).toBe("exact");
  });

  it("maps abbreviation typo T5H → TSH", () => {
    const m = matchToDictionary("T5H");
    expect(m?.canonical).toContain("TSH");
    expect(m?.matchType).toBe("abbreviation");
    expect(m!.score).toBeGreaterThanOrEqual(0.85);
  });

  it("handles typos via fuzzy matching: 'Cebplete Bleod Ceunt' → CBC", () => {
    const m = matchToDictionary("Cebplete Bleod Ceunt");
    expect(m?.canonical).toBe("Complete Blood Count");
    expect(m!.score).toBeGreaterThan(0.55);
  });

  it("strips filler words: 'Serum Creatinine Test' matches Creatinine", () => {
    const m = matchToDictionary("Serum Creatinine Test");
    expect(m?.canonical).toBe("Serum Creatinine");
    expect(m!.confidencePct).toBeGreaterThanOrEqual(80);
  });

  it("returns null for gibberish below threshold", () => {
    const m = matchToDictionary("xyzqqq nonsense words here");
    expect(m).toBeNull();
  });

  it("recognizes abbreviation inside a sentence: 'do a CBC please'", () => {
    const m = matchToDictionary("do a cbc please");
    expect(m?.canonical).toBe("Complete Blood Count");
    expect(m?.matchType).toBe("abbreviation");
  });

  it("confidencePct is always 0–100 integer", () => {
    const m = matchToDictionary("HbA1c");
    expect(Number.isInteger(m!.confidencePct)).toBe(true);
    expect(m!.confidencePct).toBeGreaterThanOrEqual(0);
    expect(m!.confidencePct).toBeLessThanOrEqual(100);
  });
});
