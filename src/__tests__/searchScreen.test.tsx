import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { SearchScreen, useSearchMode } from "@/components/search/SearchScreen";

const TEST = { id: "t1", test_name: "Glucose Fasting, Fluoride Plasma", category: "x", price: 0, collection_fee: 0, prerequisites: "", report_delivery_time: "", status: "active" };
vi.mock("@/hooks/useSmartTestSearch", () => ({
  useSmartTestSearch: (q: string) => ({ results: q ? [TEST] : [], understanding: { raw: q, text: q, core: q, tokens: [q], typedTokens: [q], concepts: [], serverTerms: [] }, isSearching: false, isError: false }),
}));
vi.mock("@/hooks/useDebounce", () => ({ useDebounce: (v: unknown) => v }));

const Screen = () => {
  const [query, setQuery] = useState("");
  const { open, openSearch, closeSearch, openTest } = useSearchMode();
  return (
    <div>
      <p>Explore screen</p>
      <button onClick={openSearch}>open search</button>
      <SearchScreen open={open} query={query} onQueryChange={setQuery} onClose={closeSearch} onOpenTest={openTest} />
    </div>
  );
};

const TestPage = () => {
  const navigate = useNavigate();
  return <div><p>Test detail page</p><button onClick={() => navigate(-1)}>page back</button></div>;
};

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={["/home", "/categories"]} initialIndex={1}>
      <Routes>
        <Route path="/home" element={<p>Home screen</p>} />
        <Route path="/categories" element={<Screen />} />
        <Route path="/test/:id" element={<TestPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("shared full-screen search (Home and Explore Tests)", () => {
  it("opens over the screen and Back closes it without leaving the screen", () => {
    renderApp();
    fireEvent.click(screen.getByText("open search"));
    expect(screen.getByRole("dialog", { name: "Search tests" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close search" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Explore screen")).toBeInTheDocument();
  });

  it("shows results without + buttons, opens the test, and Back returns to the screen", async () => {
    renderApp();
    fireEvent.click(screen.getByText("open search"));
    fireEvent.change(screen.getByPlaceholderText("Search health tests..."), { target: { value: "sugar" } });

    const result = screen.getByRole("button", { name: /Glucose Fasting/ });
    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument();
    await act(async () => fireEvent.click(result));
    expect(screen.getByText("Test detail page")).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByText("page back")));
    expect(screen.getByText("Explore screen")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows popular searches before typing", () => {
    renderApp();
    fireEvent.click(screen.getByText("open search"));
    fireEvent.click(screen.getByRole("button", { name: "Thyroid" }));
    expect(screen.getByDisplayValue("Thyroid")).toBeInTheDocument();
  });
});
