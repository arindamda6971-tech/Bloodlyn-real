import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test-utils";
import { useSmartTestSearch } from "@/hooks/useSmartTestSearch";

// A tiny bridge catalogue: the server does a plain substring match on test_name.
const CATALOGUE = [
  "Glucose Fasting, Fluoride Plasma",
  "Glucose Random, Fluoride Plasma",
  "Urine Sugar Fasting",
  "SGPT (ALT), Serum",
  "Canine - SGPT (ALT), Serum",
  "LFT (Liver Function Test) 2 - Mini",
  "Cobalt, Serum",
].map((test_name, i) => ({ id: String(i), test_name, category: "x", price: 100, collection_fee: 0, prerequisites: "", report_delivery_time: "", status: "active" }));

const fetchBridgeTests = vi.fn(async ({ search = "" }: { search?: string }) => ({
  success: true,
  categories: [],
  tests: CATALOGUE.filter((t) => t.test_name.toLowerCase().includes(search.toLowerCase())),
}));

vi.mock("@/hooks/useBridgeTests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/useBridgeTests")>()),
  fetchBridgeTests: (params: { search?: string }) => fetchBridgeTests(params),
}));

const Results = ({ query }: { query: string }) => {
  const { results } = useSmartTestSearch(query);
  return <ol>{results.map((t) => <li key={t.id}>{t.test_name}</li>)}</ol>;
};

const names = () => screen.queryAllByRole("listitem").map((li) => li.textContent);

describe("useSmartTestSearch", () => {
  beforeEach(() => {
    fetchBridgeTests.mockClear();
  });

  it("'sugar' searches the catalogue for glucose and ranks blood glucose first", async () => {
    render(<Results query="sugar" />);
    await waitFor(() => expect(names()[0]).toBe("Glucose Fasting, Fluoride Plasma"));
    expect(names()).toContain("Urine Sugar Fasting");
    expect(names().indexOf("Urine Sugar Fasting")).toBeGreaterThan(names().indexOf("Glucose Random, Fluoride Plasma"));
    const searched = fetchBridgeTests.mock.calls.map(([p]) => p.search);
    expect(searched).toEqual(expect.arrayContaining(["sugar", "glucose fasting"]));
  });

  it("'liver function test' brings in SGPT, without the canine test or substring noise", async () => {
    render(<Results query="liver function test" />);
    await waitFor(() => expect(names()).toContain("SGPT (ALT), Serum"));
    expect(names()[0]).toBe("LFT (Liver Function Test) 2 - Mini");
    expect(names()).not.toContain("Canine - SGPT (ALT), Serum");
    expect(names()).not.toContain("Cobalt, Serum");
  });

  it("does nothing for an empty query", () => {
    render(<Results query="   " />);
    expect(fetchBridgeTests).not.toHaveBeenCalled();
    expect(names()).toEqual([]);
  });
});
