import { describe, it, expect, vi } from "vitest";
import { CONSULT_TEST_NAME, deliverToDoctor } from "../../supabase/functions/_shared/doctor-partner";

// A doctor booking must reach the doctor: delivery is retried, and the caller is told
// plainly when it still didn't get through so the booking can be taken back.
const noWait = async () => {};
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });

describe("sending a booking to the doctor", () => {
  it("delivers on the first attempt", async () => {
    const fetchImpl = vi.fn(async () => reply(200, { success: true }));
    const res = await deliverToDoctor({ external_booking_id: "o1" }, "secret", { fetchImpl, wait: noWait });
    expect(res).toMatchObject({ ok: true, refused: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["x-webhook-secret"]).toBe("secret");
  });

  it("tries again after a network failure or a server error", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(reply(500))
      .mockResolvedValueOnce(reply(200));
    const res = await deliverToDoctor({}, "secret", { fetchImpl, wait: noWait });
    expect(res.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("gives up after the last attempt and says it wasn't delivered", async () => {
    const fetchImpl = vi.fn(async () => reply(503));
    const res = await deliverToDoctor({}, "secret", { fetchImpl, wait: noWait });
    expect(res).toMatchObject({ ok: false, refused: false, status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("doesn't retry a booking the doctor's side refused", async () => {
    const fetchImpl = vi.fn(async () => reply(403, { code: "vendor_not_approved" }));
    const res = await deliverToDoctor({}, "secret", { fetchImpl, wait: noWait });
    expect(res).toEqual({ ok: false, refused: true, status: 403, code: "vendor_not_approved" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("recognises a doctor booking by its name", () => {
    expect(CONSULT_TEST_NAME.test("Video Call with Dr Rina Sen (Self)")).toBe(true);
    expect(CONSULT_TEST_NAME.test("Physical Appointment with Dr A (Pk)")).toBe(true);
    expect(CONSULT_TEST_NAME.test("CBC Haemogram")).toBe(false);
  });
});
