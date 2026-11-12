import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "patient-1" } }) }));
vi.mock("@/components/layout/MobileLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import BookDoctorScreen, { type BookDoctorState } from "@/pages/BookDoctorScreen";

const booking: BookDoctorState = {
  doctor: {
    id: "3fdc95ff-7f47-4823-a115-c6abcf905041",
    name: "Dr Ar Das",
    specialty: "General Physician",
    experience: 5,
    rating: 0,
    reviews: 0,
    available: true,
    nextSlot: "",
    videoCallFee: 400,
    audioCallFee: 400,
    physicalCallFee: 0,
    qualification: "MBBS",
  },
  type: "audio",
  patient: { name: "Pk", age: "43", gender: "Female", phone: "8575575757" },
  symptoms: "Fever",
};

const renderScreen = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: "/book-doctor", state: booking }]}>
        <Routes>
          <Route path="/book-doctor" element={<BookDoctorScreen />} />
          <Route path="/appointment/:id" element={<p>appointment page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const sentBody = () => invoke.mock.calls.find(([name]) => name === "create-order")![1].body;

describe("Book doctor screen", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: { orderId: "order-9" }, error: null });
  });

  it("offers only today, tomorrow and the day after, with no times", () => {
    renderScreen();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Tomorrow")).toBeTruthy();
    expect(screen.getAllByRole("button").filter((b) => /AM|PM/.test(b.textContent || ""))).toHaveLength(0);
  });

  it("books today straight away, as soon as possible, with no lab id", async () => {
    renderScreen();
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
    const body = sentBody();
    expect(body.scheduledTimeSlot).toBe("As soon as possible");
    expect(body.labId).toBeNull();
    expect(body.cartItems[0]).toMatchObject({ id: `doc-audio-${booking.doctor.id}`, price: 400, labId: null, name: "Audio Call with Dr Ar Das (Pk)" });
    expect(body.reason).toBe("Fever");
  });

  it("books a later day for any time that day", async () => {
    renderScreen();
    fireEvent.click(screen.getByText("Tomorrow"));
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
    expect(sentBody().scheduledTimeSlot).toBe("Any time that day");
  });

  const sentKey = (call: number) =>
    invoke.mock.calls.filter(([name]) => name === "create-order")[call][1].headers["Idempotency-Key"] as string;

  it("retries a booking under the same key, and books again under a new one", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: "We couldn't reach the doctor" }), { status: 502 }) } });
    const first = renderScreen();
    fireEvent.click(screen.getByText("Confirm booking"));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(screen.getByText("Confirm booking").closest("button")!.disabled).toBe(false));
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
    expect(sentKey(1)).toBe(sentKey(0));
    // Not the patient's id, doctor and day alone: that made a second family member's
    // booking (or one made after cancelling) come back as the first booking.
    expect(sentKey(0)).not.toContain("patient-1");
    first.unmount();

    renderScreen();
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
    expect(sentKey(2)).not.toBe(sentKey(0));
  });

  it("opens the booking the patient already has instead of booking twice", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { context: new Response(JSON.stringify({ error: "Already booked", code: "already_booked", orderId: "order-1" }), { status: 409 }) },
    });
    renderScreen();
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
  });
});
