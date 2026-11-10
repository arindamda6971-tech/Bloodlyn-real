import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@/test-utils";
import BookingsScreen from "@/pages/BookingsScreen";

const baseOrder = {
  status: "confirmed",
  total: 209,
  created_at: "2026-11-07T14:47:00Z",
  lab_name: "DXB Health care Solutions",
  scheduled_date: "2026-11-10",
  scheduled_time_slot: "Morning (6 AM - 8 AM)",
  patient_name: "Pk",
};

vi.mock("@/hooks/useOrders", () => ({
  useOrders: () => ({
    isLoading: false,
    data: [
      { ...baseOrder, id: "moved", order_number: "HS1", test_name: "Glucose Fasting", reschedule_count: 1 },
      { ...baseOrder, id: "same", order_number: "HS2", test_name: "Lipid Profile", reschedule_count: 0 },
      { ...baseOrder, id: "done", order_number: "HS4", test_name: "Vitamin D", status: "report_delivered" },
      { ...baseOrder, id: "gone", order_number: "HS3", test_name: "HbA1c", reschedule_count: 1, status: "cancelled" },
    ],
  }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/useRealtimeOrders", () => ({ useRealtimeOrders: () => {} }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <BookingsScreen />
    </MemoryRouter>,
  );

describe("My Orders tile", () => {
  it("marks a booking the patient moved as Rescheduled, like its details page", async () => {
    renderPage();
    expect(await screen.findByText("Glucose Fasting")).toBeInTheDocument();
    expect(screen.getByText("HbA1c")).toBeInTheDocument();
    // The moved, still-active booking's date is labelled "Rescheduled" instead of
    // "Scheduled" (no extra line); the others, cancelled included, keep "Scheduled".
    expect(screen.getAllByText("Rescheduled")).toHaveLength(1);
    expect(screen.getAllByText("Scheduled")).toHaveLength(3);
  });
});
