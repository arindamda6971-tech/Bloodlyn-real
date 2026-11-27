import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The doctor (or the collection partner) rings while BloodLyn is open, or opened during
// the ring: the app rings on its own screen. That is the only ring there is.

const h = vi.hoisted(() => ({
  orders: [] as unknown[],
  calls: [] as unknown[],
  startRingtone: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "patient-1" } }) }));
vi.mock("@/integrations/supabase/client", () => {
  const query = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "gte", "order"]) q[m] = () => q;
    q.limit = async () => ({ data: table === "orders" ? h.orders : h.calls, error: null });
    q.update = () => ({ eq: async () => ({ error: null }) });
    return q;
  };
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { from: query, channel: () => channel, removeChannel: () => {}, functions: { invoke: vi.fn() } } };
});
vi.mock("@/lib/ringtone", () => ({ startRingtone: h.startRingtone, stopRingtone: () => {} }));
vi.mock("@/lib/callSignal", () => ({ tellDoctor: vi.fn(async () => true) }));
vi.mock("@/lib/join-consultation", () => ({ joinConsultation: vi.fn(async () => {}) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: { schedule: vi.fn(async () => ({})) } }));

import { IncomingCallListener } from "@/components/IncomingCallListener";
import { CollectionCallListener } from "@/components/CollectionCallListener";

describe("ringing while BloodLyn is open", () => {
  beforeEach(() => {
    h.orders = [];
    h.calls = [];
    h.startRingtone.mockClear();
  });

  it("rings for the doctor's Google Meet call", async () => {
    h.orders = [
      {
        id: "0b6f6d2e-1c2a-4f6e-9a51-7a3c1f0e9d11",
        status: "confirmed",
        call_status: "ringing",
        call_status_at: new Date().toISOString(),
        test_name: "Audio Call with Dr Ar Das (Pk)",
        order_number: "DOC-1",
        meet_link: "https://meet.google.com/ogv-gvvc-qkn",
      },
    ];
    render(
      <MemoryRouter>
        <IncomingCallListener />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Dr Ar Das is calling")).toBeInTheDocument();
    expect(screen.getByText("Join on Google Meet")).toBeInTheDocument();
    await waitFor(() => expect(h.startRingtone).toHaveBeenCalled());
  });

  it("rings for the collection partner's call", async () => {
    h.calls = [
      {
        id: "7d1c2b3a-0000-4000-8000-000000000001",
        status: "ringing",
        created_at: new Date().toISOString(),
        caller_name: "Ravi",
        lab_name: "Apex Lab",
        direction: "to_patient",
      },
    ];
    render(<CollectionCallListener />);
    expect(await screen.findByText("Your collection partner from Apex Lab is calling")).toBeInTheDocument();
    await waitFor(() => expect(h.startRingtone).toHaveBeenCalled());
  });
});
