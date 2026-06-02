import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => {
  const vendorAlpha = "11111111-1111-4111-8111-111111111111";
  const vendorBeta = "22222222-2222-4222-8222-222222222222";
  const labs = [
    {
      id: "lab-alpha",
      name: "Lab Alpha",
      rating: 4.8,
      reviews_count: 20,
      home_collection_available: true,
      vendor_id: vendorAlpha,
      opening_time: "06:00",
      closing_time: "22:00",
      available_tests: [{ name: "CBC", price: 300 }],
    },
    {
      id: "lab-beta",
      name: "Lab Beta",
      rating: 4.7,
      reviews_count: 18,
      home_collection_available: true,
      vendor_id: vendorBeta,
      opening_time: "06:00",
      closing_time: "22:00",
      available_tests: [{ name: "CBC", price: 320 }],
    },
  ];

  return {
    vendorAlpha,
    vendorBeta,
    labs,
    invoke: vi.fn(),
  };
});

vi.mock("@/hooks/useUserPincode", () => ({
  useUserPincode: () => ({ pincode: null, loading: false }),
  labServesPincode: () => true,
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    items: [{ id: "test-cbc", name: "CBC", price: 300, quantity: 1 }],
    updateLabForItems: vi.fn(),
    subtotal: 300,
    currentLabId: null,
    currentLabName: null,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
    from: (table: string) => {
      if (table === "diagnostic_centers") {
        let selectedLabId = "";
        const builder: any = {
          select: vi.fn(() => builder),
          order: vi.fn(async () => ({ data: mocks.labs, error: null })),
          eq: vi.fn((_field: string, value: string) => {
            selectedLabId = value;
            return builder;
          }),
          maybeSingle: vi.fn(async () => ({
            data: mocks.labs.find((lab) => lab.id === selectedLabId) ?? null,
            error: null,
          })),
        };
        return builder;
      }

      if (table === "products") {
        const builder: any = {
          select: vi.fn(() => builder),
          in: vi.fn(() => builder),
          eq: vi.fn(async () => ({
            data: mocks.labs.map((lab) => ({ vendor_id: lab.vendor_id, product_name: "CBC" })),
            error: null,
          })),
        };
        return builder;
      }

      return {};
    },
  },
}));

import LabSelectionScreen from "@/pages/LabSelectionScreen";

const rowsForEveryDay = (slots: string[]) =>
  Array.from({ length: 7 }, (_, day_of_week) => ({
    day_of_week,
    is_open: true,
    slots,
  }));

describe("LabSelectionScreen timing regression", () => {
  it("loads configured timings for each selected lab and replaces stale slots immediately", async () => {
    const user = userEvent.setup();

    mocks.invoke.mockImplementation(async (_functionName: string, options: { body: { lab_user_id: string } }) => {
      if (options.body.lab_user_id === mocks.vendorAlpha) {
        return { data: { rows: rowsForEveryDay(["8:00 AM - 10:00 AM", "10:00 PM - 12:00 AM"]) }, error: null };
      }
      if (options.body.lab_user_id === mocks.vendorBeta) {
        return { data: { rows: rowsForEveryDay(["6:00 PM - 8:00 PM", "8:00 PM - 10:00 PM"]) }, error: null };
      }
      return { data: { rows: rowsForEveryDay([]) }, error: null };
    });

    render(
      <MemoryRouter initialEntries={["/lab-selection"]}>
        <Routes>
          <Route path="/lab-selection" element={<LabSelectionScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: /Lab Alpha/i }));

    await waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith("lab-slots", {
        body: { lab_user_id: mocks.vendorAlpha },
      })
    );
    expect(await screen.findByRole("button", { name: "10:00 PM - 12:00 AM" })).toBeInTheDocument();
    expect(within(screen.getByText(/🌆 Evening/i).parentElement!).getByText("10:00 PM - 12:00 AM")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Lab Beta/i }));

    await waitFor(() => expect(screen.queryByText("10:00 PM - 12:00 AM")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith("lab-slots", {
        body: { lab_user_id: mocks.vendorBeta },
      })
    );
    expect(await screen.findByRole("button", { name: "6:00 PM - 8:00 PM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "8:00 PM - 10:00 PM" })).toBeInTheDocument();
  });
});