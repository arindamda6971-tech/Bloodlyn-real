import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { render } from "@/test-utils";
import PaymentProcessingScreen from "@/pages/PaymentProcessingScreen";
import LabSelectionScreen from "@/pages/LabSelectionScreen";

// An empty cart: the order was placed (or the cart was cleared) before Back.
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    items: [],
    subtotal: 0,
    currentLabId: null,
    currentLabName: null,
    updateLabForItems: vi.fn(),
    clearCart: vi.fn(),
    removeFromCart: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" }, supabaseUserId: "user-1" }) }));
vi.mock("@/hooks/useUserPincode", () => ({ useUserPincode: () => ({ pincode: null }), labServesPincode: () => true }));
vi.mock("@/hooks/useLabSlots", () => ({ useLabSlots: () => ({ slotsByDay: {}, loading: false }) }));
vi.mock("@/hooks/useLiveTestRules", () => ({ useLiveTestRules: () => ({ prescriptionTests: [] }) }));

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit", "neq", "ilike", "or"]) chain[m] = () => chain;
  chain.maybeSingle = async () => ({ data: null, error: null });
  chain.then = (cb: (v: unknown) => unknown) => cb({ data: [], error: null });
  const session = { access_token: "token", expires_at: Date.now() / 1000 + 3600 };
  return {
    supabase: {
      from: () => chain,
      auth: {
        getSession: async () => ({ data: { session } }),
        refreshSession: async () => ({ data: { session } }),
      },
      functions: {
        invoke: async () => ({ data: { orderId: "order-1", orderNumber: "HS1", total: 429 }, error: null }),
      },
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: vi.fn(),
    },
  };
});

/** A stand-in screen with a Back control, like the phone's back gesture. */
const Probe = ({ label }: { label: string }) => {
  const navigate = useNavigate();
  return (
    <div>
      <p>{label}</p>
      <button onClick={() => navigate(-1)}>system back</button>
    </div>
  );
};

const processingState = {
  orderPayload: {},
  successState: { paymentVerified: true, total: 429, cartItems: [] },
  resolvedVendorId: "vendor-1",
  idempotencyKey: "checkout-test",
  cartItems: [{ id: "cbc", name: "CBC", price: 300, quantity: 1 }],
  paymentState: {},
  labId: "lab-1",
  labName: "Test Lab",
  orderAddress: null,
  selectedPaymentMethod: { id: "cod", name: "Pay after blood collection" },
};

describe("Back navigation after placing an order", () => {
  it("goes Home from the order placed screen, not back into checkout", async () => {
    render(
      <MemoryRouter
        initialEntries={["/home", "/cart", "/lab-selection", "/payment", { pathname: "/payment-processing", state: processingState }]}
        initialIndex={4}
      >
        <Routes>
          <Route path="/home" element={<Probe label="HOME" />} />
          <Route path="/cart" element={<Probe label="CART" />} />
          <Route path="/lab-selection" element={<Probe label="LAB SELECTION" />} />
          <Route path="/payment" element={<Probe label="PAYMENT" />} />
          <Route path="/payment-processing" element={<PaymentProcessingScreen />} />
          <Route path="/order-success" element={<Probe label="ORDER PLACED" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("ORDER PLACED", {}, { timeout: 8000 })).toBeInTheDocument();
    fireEvent.click(screen.getByText("system back"));
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });

  it("does not trap Back in an empty-cart loop", async () => {
    render(
      <MemoryRouter initialEntries={["/home", "/cart", "/lab-selection"]} initialIndex={2}>
        <Routes>
          <Route path="/home" element={<Probe label="HOME" />} />
          <Route path="/cart" element={<Probe label="CART" />} />
          <Route path="/lab-selection" element={<LabSelectionScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // The empty cart sends Lab selection to the cart in place of itself…
    expect(await screen.findByText("CART")).toBeInTheDocument();
    // …so Back walks out of checkout (to the cart opened before it, then Home)
    // instead of reopening Lab selection, which would push the cart again forever.
    fireEvent.click(screen.getByText("system back"));
    expect(await screen.findByText("CART")).toBeInTheDocument();
    expect(screen.queryByText("No items in cart")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("system back"));
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });
});
