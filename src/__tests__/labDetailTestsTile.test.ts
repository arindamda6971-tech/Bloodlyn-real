import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("lab page Tests tile", () => {
  const source = readFileSync("src/pages/LabDetailScreen.tsx", "utf8");

  it("shows every test instead of filtering to a fixed category name", () => {
    // Labs name their own categories, so "Blood Tests" matched nothing and emptied the list.
    expect(source).not.toContain('setSelectedCategory("Blood Tests")');
  });

  it("ignores a category the current tab doesn't have", () => {
    expect(source).toContain("availableCategories.includes(selectedCategory)");
    expect(source).toContain("activeCategory ? test.category === activeCategory : true");
  });
});
