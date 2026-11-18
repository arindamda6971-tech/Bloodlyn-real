import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "patient-1" } }) }));
vi.mock("@/components/layout/MobileLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/hooks/useSelfPatient", () => ({ useSelfPatient: () => ({ name: "Ar", age: "30", gender: "Male", phone: "9000000000" }) }));
vi.mock("@/hooks/useFamilyMembers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/useFamilyMembers")>()),
  useFamilyMembers: () => ({
    members: [{ id: "fm-1", fullName: "Rina", age: "60", gender: "Female", phone: "9111111111", relationship: "Mother" }],
    addMember: vi.fn(),
  }),
}));

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
    qualification: "MBBS",
  },
  type: "audio",
  specialty: "ent",
  patient: { name: "Pk", age: "43", gender: "Female", phone: "8575575757" },
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

  it("has no day or time to pick: the doctor calls shortly", () => {
    renderScreen();
    expect(screen.queryByText("When?")).toBeNull();
    expect(screen.queryByText("Tomorrow")).toBeNull();
    expect(screen.getAllByRole("button").filter((b) => /AM|PM/.test(b.textContent || ""))).toHaveLength(0);
    expect(screen.getByText(/will call you shortly/)).toBeTruthy();
  });

  it("books today straight away, as soon as possible, with no lab id", async () => {
    renderScreen();
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
    const body = sentBody();
    expect(body.scheduledTimeSlot).toBe("As soon as possible");
    expect(body.labId).toBeNull();
    expect(body.cartItems[0]).toMatchObject({ id: `doc-audio-${booking.doctor.id}`, price: 400, labId: null, name: "Audio Call with Dr Ar Das (Pk)" });
    // Saying what's wrong is optional: the patient can tell the doctor on the call.
    expect(body.reason).toBeUndefined();
  });

  it("always books for today", async () => {
    renderScreen();
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
    const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
    expect(sentBody().scheduledDate).toBe(today);
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
  it("offers the chosen specialty's problems, and sends them with the note and health details", async () => {
    renderScreen();
    // ENT was picked on the doctor list, so ear and throat problems are offered, not fever.
    expect(screen.queryByRole("button", { name: "Fever" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ear pain" }));
    fireEvent.click(screen.getByRole("button", { name: "Sore throat" }));
    fireEvent.change(screen.getByLabelText("Describe the problem"), { target: { value: "since 3 days" } });
    fireEvent.click(screen.getByText(/Health details/));
    fireEvent.change(screen.getByPlaceholderText("120/80"), { target: { value: "130/85" } });
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
    expect(sentBody().reason).toBe("Ear pain, Sore throat. since 3 days, BP 130/85");
  });

  it("offers the doctor's own specialty's problems when none was chosen", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[{ pathname: "/book-doctor", state: { ...booking, specialty: null } }]}>
          <Routes>
            <Route path="/book-doctor" element={<BookDoctorScreen />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: "Fever" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ear pain" })).toBeNull();
  });

  it("books for a family member, and for the consultation type picked", async () => {
    const withoutPatient = { ...booking, patient: undefined };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[{ pathname: "/book-doctor", state: withoutPatient }]}>
          <Routes>
            <Route path="/book-doctor" element={<BookDoctorScreen />} />
            <Route path="/appointment/:id" element={<p>appointment page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Video/ }));
    fireEvent.click(screen.getByRole("button", { name: /Rina/ }));
    fireEvent.click(screen.getByText("Confirm booking"));
    await screen.findByText("appointment page");
    const body = sentBody();
    expect(body.cartItems[0]).toMatchObject({ id: `doc-video-${booking.doctor.id}`, name: "Video Call with Dr Ar Das (Rina)" });
    expect(body).toMatchObject({ patientName: "Rina", patientAge: 60, patientGender: "Female", patientPhone: "9111111111" });
  });
});
