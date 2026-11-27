import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Failed loads, saves and bookings are written to client_errors. These check what is
// sent, what is left out (a patient's details, expected refusals) and that nothing is
// sent while the phone is offline.
const inserted: Array<{ message: string; path: string }> = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ insert: async (row: { message: string; path: string }) => { inserted.push(row); return {}; } }),
  },
}));

// reportError keeps a per-visit count and dedupe list, so every test gets a fresh copy.
const load = async () => {
  vi.resetModules();
  return { ...(await import("@/lib/reportError")), ...(await import("@/lib/reportBookingError")) };
};
const refused = (status: number, body: unknown) =>
  Object.assign(new Error("Edge Function returned a non-2xx status code"), {
    context: new Response(JSON.stringify(body), { status }),
  });

describe("failure reports", () => {
  beforeEach(() => {
    inserted.length = 0;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends nothing while the phone is offline", async () => {
    vi.stubGlobal("navigator", { ...navigator, onLine: false, userAgent: "test" });
    const { reportError } = await load();
    await reportError(new Error("Failed to fetch"), "Load failed (orders)");
    expect(inserted).toHaveLength(0);
  });

  it("names a failed load by its key, never by the ids in it", async () => {
    const { reportQueryError } = await load();
    await reportQueryError(new Error("boom"), { queryKey: ["orders", "user-123"] });
    expect(inserted.map((r) => r.message)).toEqual(["Load failed (orders): boom"]);
  });

  it("names a failed save by its label and new status, and leaves the patient's details out", async () => {
    const { reportMutationError } = await load();
    await reportMutationError(new Error("timeout"), { status: "cancelled", patientPhone: "9876543210", patientName: "Rahul Das" }, { options: { meta: { reportAs: "booking" } } });
    // A "status" that isn't a status word is left out too.
    await reportMutationError(new Error("other"), { status: "Rahul Das" }, { options: {} });
    expect(inserted.map((r) => r.message)).toEqual(["Save failed (booking → cancelled): timeout", "Save failed: other"]);
    expect(JSON.stringify(inserted)).not.toMatch(/9876543210|Rahul/);
  });

  it("skips a booking the server refused on purpose and reports one that broke", async () => {
    const { reportBookingFailure, readRefusal } = await load();
    const full = refused(409, { code: "slot_capacity_reached", error: "This time is full" });
    await reportBookingFailure("BP", full, await readRefusal(full));
    const down = refused(503, { code: "capacity_unavailable", error: "Slot availability is temporarily unavailable. Please try again." });
    await reportBookingFailure("BP", down, await readRefusal(down));
    expect(inserted.map((r) => r.message)).toEqual([
      "Booking failed (BP): Slot availability is temporarily unavailable. Please try again., code capacity_unavailable, HTTP 503",
    ]);
  });

  it("reports a booking that never got an answer", async () => {
    const { reportBookingFailure } = await load();
    await reportBookingFailure("checkout", new TypeError("Failed to fetch"));
    expect(inserted.map((r) => r.message)).toEqual(["Booking failed (checkout): Failed to fetch"]);
  });

  it("reports a cancel or reschedule only when something broke, not when it was refused", async () => {
    const { reportBookingChangeFailure, readRefusal } = await load();
    const assigned = refused(409, { error: "A collection partner is already assigned" });
    await reportBookingChangeFailure("cancel", assigned, await readRefusal(assigned));
    const crashed = refused(500, { error: "db timeout" });
    await reportBookingChangeFailure("reschedule", crashed, await readRefusal(crashed));
    expect(inserted.map((r) => r.message)).toEqual(["Booking failed (reschedule): db timeout, HTTP 500"]);
  });

  it("reads a refusal from a copy, so the screen can still read the reason", async () => {
    const { readRefusal } = await load();
    const err = refused(400, { code: "prescription_required", error: "Attach a prescription" });
    expect(await readRefusal(err)).toEqual({ code: "prescription_required", error: "Attach a prescription" });
    await expect(err.context.json()).resolves.toEqual({ code: "prescription_required", error: "Attach a prescription" });
  });
});
