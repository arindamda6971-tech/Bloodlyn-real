import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, fireEvent, waitFor, act } from "@/test-utils";
import CategoryTestsScreen from "@/pages/CategoryTestsScreen";

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    addToCart: vi.fn(), pendingItem: null, confirmReplace: vi.fn(), cancelReplace: vi.fn(), items: [], hasItem: () => false,
  }),
}));
vi.mock("@/components/layout/MobileLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/layout/ScreenHeader", () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));

// A 120-test "specialized" category served 50 per page, like the bridge.
const CATEGORY = Array.from({ length: 120 }, (_, i) => ({
  id: `t${i}`,
  test_name: i === 110 ? "Tyrosine - Quantitative, EDTA Plasma" : `Special Test ${String(i).padStart(3, "0")}`,
  category: "specialized", price: 0, collection_fee: 0, prerequisites: "", report_delivery_time: "", status: "active",
}));
const OTHER = [{ ...CATEGORY[0], id: "x1", test_name: "Tyrosine Kinase Panel", category: "genetics" }];

const fetchBridgeTests = vi.fn(async ({ category, search = "", limit = 20, page = 1 }: { category?: string; search?: string; limit?: number; page?: number }) => {
  const pool = [...CATEGORY, ...OTHER].filter((t) => (!category || t.category === category) && t.test_name.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(pool.length / limit));
  if (page > pages) throw new Error("Internal server error"); // the real bridge fails past the end
  return {
    success: true,
    categories: [],
    tests: pool.slice((page - 1) * limit, page * limit),
    pagination: { page, pages, total: pool.length, limit, has_more: page < pages, next_page: page < pages ? page + 1 : null },
  };
});

// Mock at the network edge (the bridge-proxy call), where the app sends string params.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: async (_fn: string, { body }: { body: { params: Record<string, string> } }) => {
        const { category, search, limit, page } = body.params;
        try {
          const data = await fetchBridgeTests({ category, search, limit: Number(limit), page: page ? Number(page) : 1 });
          return { data, error: null };
        } catch (e) {
          return { data: null, error: e as Error };
        }
      },
    },
  },
}));

// Let the test scroll: fire the "load more" sentinel on demand.
let intersect: (() => void) | null = null;
const OriginalIO = window.IntersectionObserver;
beforeEach(() => {
  fetchBridgeTests.mockClear();
  intersect = null;
  window.IntersectionObserver = class {
    constructor(private cb: IntersectionObserverCallback) {}
    observe() { intersect = () => this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    unobserve() {}
    disconnect() { intersect = null; }
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  window.IntersectionObserver = OriginalIO;
});

const renderCategory = () =>
  render(
    <MemoryRouter initialEntries={["/category-tests?slug=specialized&name=Specialized"]}>
      <Routes><Route path="/category-tests" element={<CategoryTestsScreen />} /></Routes>
    </MemoryRouter>
  );

const rows = () => screen.queryAllByRole("heading", { level: 3 }).length;

describe("Category tests page", () => {
  it("opens with the first 50 tests and the real total", async () => {
    renderCategory();
    await waitFor(() => expect(rows()).toBe(50));
    expect(screen.getByText("120 tests")).toBeInTheDocument();
    expect(fetchBridgeTests).toHaveBeenCalledTimes(1);
    expect(fetchBridgeTests.mock.calls[0][0]).toMatchObject({ category: "specialized", limit: 50, page: 1 });
  });

  it("loads the next pages as the user scrolls, until every test is shown", async () => {
    renderCategory();
    await waitFor(() => expect(rows()).toBe(50));

    await act(async () => intersect?.());
    await waitFor(() => expect(rows()).toBe(100));
    await act(async () => intersect?.());
    await waitFor(() => expect(rows()).toBe(120));

    expect(screen.queryByLabelText("Loading more tests")).not.toBeInTheDocument();
    expect(fetchBridgeTests.mock.calls.map(([p]) => p.page)).toEqual([1, 2, 3]); // never asks past the last page
  });

  it("search inside the category finds a test that hasn't been loaded yet", async () => {
    renderCategory();
    await waitFor(() => expect(rows()).toBe(50));
    expect(screen.queryByText(/Tyrosine/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search in Specialized..."), { target: { value: "tyrosine" } });

    await waitFor(() => expect(screen.getByText(/Tyrosine - Quantitative/)).toBeInTheDocument());
    expect(screen.queryByText("Tyrosine Kinase Panel")).not.toBeInTheDocument(); // other category
    const searchCalls = fetchBridgeTests.mock.calls.map(([p]) => p).filter((p) => p.search);
    expect(searchCalls.length).toBeGreaterThan(0);
    expect(searchCalls.every((p) => p.category === "specialized")).toBe(true);
  });
});
