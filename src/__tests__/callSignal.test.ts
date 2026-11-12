import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// What the patient did with the doctor's call goes to the doctor through the partner's
// call-signal function, signed with the patient's own session.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: "patient-token" } } }) },
  },
}));

import { PARTNER_CALL_SIGNAL_URL, tellDoctor } from "@/lib/callSignal";

describe("patient call messages", () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to the partner's call-signal with the patient's token", async () => {
    await expect(tellDoctor("order-1", "patient-declined")).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(PARTNER_CALL_SIGNAL_URL);
    expect((init.headers as Record<string, string>)["x-patient-token"]).toBe("patient-token");
    expect(JSON.parse(init.body as string)).toEqual({ orderId: "order-1", event: "patient-declined" });
  });

  it("reports a refused message instead of throwing", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 403 }));
    await expect(tellDoctor("order-1", "patient-joined")).resolves.toBe(false);
  });

  it("reports a network failure instead of throwing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(tellDoctor("order-1", "patient-missed")).resolves.toBe(false);
  });
});
