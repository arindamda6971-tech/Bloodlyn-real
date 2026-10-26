import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TestCard from "@/components/tests/TestCard";
import { useTestListActions } from "@/components/tests/useTestListActions";

const addToCart = vi.fn(() => true);
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addToCart, hasItem: () => false }),
}));
vi.mock("@/hooks/useUserPincode", () => ({
  useUserPincode: () => ({ pincode: "700001" }),
  labServesPincode: () => true,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let labs: Record<string, unknown>[] = [];
vi.mock("@/integrations/supabase/client", () => {
  const query = (rows: () => unknown[]) => {
    const q = {
      select: () => q,
      order: () => q,
      in: () => q,
      eq: () => q,
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: rows(), error: null }),
    };
    return q;
  };
  return {
    supabase: { from: (table: string) => query(() => (table === "diagnostic_centers" ? labs : [])) },
  };
});

const TEST = {
  id: "t1",
  test_name: "Glucose Fasting, Fluoride Plasma",
  category: "clinical-chemistry",
  price: 0,
  collection_fee: 0,
  prerequisites: "",
  report_delivery_time: "",
  status: "active",
};

const List = () => {
  const actions = useTestListActions();
  return (
    <>
      <TestCard
        test={TEST}
        inCart={false}
        onOpen={actions.onOpen}
        onAdd={actions.onAdd}
        onOpenCart={actions.onOpenCart}
      />
      {actions.labSheet}
    </>
  );
};

const renderList = () =>
  render(
    <MemoryRouter initialEntries={["/categories"]}>
      <Routes>
        <Route path="/categories" element={<List />} />
        <Route path="/lab/:id" element={<p>lab page</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("Add on a test card", () => {
  beforeEach(() => {
    addToCart.mockClear();
    labs = [];
  });

  it("opens Select a Lab instead of adding straight to the cart", async () => {
    labs = [{ id: "lab-1", name: "City Lab", rating: 4.6, available_tests: ["glucose fasting, fluoride plasma"], pricing: { "glucose fasting, fluoride plasma": 120 } }];
    renderList();

    fireEvent.click(screen.getByRole("button", { name: /add glucose fasting to cart/i }));
    expect(addToCart).not.toHaveBeenCalled();
    expect(await screen.findByText("Select a Lab")).toBeTruthy();
    expect(await screen.findByText("City Lab")).toBeTruthy();
    expect(screen.getByText("₹120")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select & Add" }));
    expect(addToCart).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", name: TEST.test_name, price: 120, labId: "lab-1", labName: "City Lab" }),
    );
    await waitFor(() => expect(screen.getByText("lab page")).toBeTruthy());
  });

  it("shows No labs available when no lab offers the test", async () => {
    labs = [{ id: "lab-2", name: "Other Lab", available_tests: ["lipid profile"] }];
    renderList();

    fireEvent.click(screen.getByRole("button", { name: /add glucose fasting to cart/i }));
    expect(await screen.findByText("No labs available")).toBeTruthy();
    expect(addToCart).not.toHaveBeenCalled();
  });
});
