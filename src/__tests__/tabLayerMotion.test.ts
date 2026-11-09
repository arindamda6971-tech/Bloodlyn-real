import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TAB_COVERED_CLASS, TAB_LAYER_ENTER_CLASS, TAB_UNCOVER_CLASS } from "@/lib/navigation-transition";

// Kept-alive tab layers (Home especially) are big. Their motion classes must stay cheap
// to start, or the slide/fade jitters on Android: no "pause every child" rule (restyles
// the whole screen on the first frame) and no will-change (re-creates the layer).
const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const ruleBody = (cls: string) => {
  const m = css.match(new RegExp(String.raw`\.${cls}\s*\{([^}]*)\}`));
  return m?.[1] ?? null;
};

describe("tab layer motion stays light", () => {
  for (const cls of [TAB_LAYER_ENTER_CLASS, TAB_COVERED_CLASS, TAB_UNCOVER_CLASS]) {
    it(`${cls} only animates`, () => {
      const body = ruleBody(cls);
      expect(body).toContain("animation:");
      expect(body).not.toContain("will-change");
      expect(css).not.toMatch(new RegExp(String.raw`\.${cls}\s+\*`));
    });
  }

  it("keeps every tab layer composited", () => {
    expect(css).toMatch(/\.home-stack,\s*\.tab-stack\s*\{\s*transform:\s*translateZ\(0\);/);
  });
});
