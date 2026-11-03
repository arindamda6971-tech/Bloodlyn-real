import { describe, expect, it } from "vitest";
import { groupByMonth, hasReport, inRange, periodRange } from "@/lib/report-list";

const order = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  report_url: "reports/cbc.pdf" as string | null,
  updated_at: "2026-11-03T10:00:00",
  ...over,
});

const NOW = new Date(2026, 10, 3, 15, 0); // 3 Nov 2026, 3 PM
const none = { from: "", to: "" };

describe("report list", () => {
  it("counts an order as a report only when the lab has sent a file", () => {
    expect(hasReport(order({ report_url: null }))).toBe(false);
    expect(hasReport(order({ report_url: "  " }))).toBe(false);
    expect(hasReport(order())).toBe(true);
  });

  it("keeps the last 3 or 6 months, counted back from today", () => {
    const three = periodRange("3m", none, NOW);
    expect(inRange(order({ updated_at: "2026-08-03T00:00:00" }), three)).toBe(true);
    expect(inRange(order({ updated_at: "2026-08-02T23:59:00" }), three)).toBe(false);
    const six = periodRange("6m", none, NOW);
    expect(inRange(order({ updated_at: "2026-06-10T10:00:00" }), six)).toBe(true);
    expect(inRange(order({ updated_at: "2026-04-10T10:00:00" }), six)).toBe(false);
  });

  it("includes the whole last day of a custom range, either way round", () => {
    const range = periodRange("custom", { from: "2026-10-01", to: "2026-10-31" }, NOW);
    expect(inRange(order({ updated_at: "2026-10-31T23:30:00" }), range)).toBe(true);
    expect(inRange(order({ updated_at: "2026-11-01T00:10:00" }), range)).toBe(false);
    expect(inRange(order({ updated_at: "2026-09-30T23:00:00" }), range)).toBe(false);
    const flipped = periodRange("custom", { from: "2026-10-31", to: "2026-10-01" }, NOW);
    expect(inRange(order({ updated_at: "2026-10-15T10:00:00" }), flipped)).toBe(true);
  });

  it("leaves a custom range open on a side with no day picked", () => {
    const fromOnly = periodRange("custom", { from: "2026-10-01", to: "" }, NOW);
    expect(inRange(order(), fromOnly)).toBe(true);
    expect(inRange(order({ updated_at: "2026-09-01T10:00:00" }), fromOnly)).toBe(false);
    expect(inRange(order({ updated_at: "2020-01-01T10:00:00" }), periodRange("all", none, NOW))).toBe(true);
  });

  it("groups by month, newest first", () => {
    const groups = groupByMonth([
      order({ id: "oct", updated_at: "2026-10-20T10:00:00" }),
      order({ id: "nov", updated_at: "2026-11-02T10:00:00" }),
      order({ id: "nov2", updated_at: "2026-11-03T10:00:00" }),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["November 2026", "October 2026"]);
    expect(groups[0].orders.map((o) => o.id)).toEqual(["nov2", "nov"]);
  });
});
