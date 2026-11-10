import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The patient's call messages go to the doctor through the partner's call-signal
// function, signed with the patient's own session; never straight into a channel.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: "patient-token" } } }) },
  },
}));

import { PARTNER_CALL_SIGNAL_URL, sendToDoctor, waitForIceGathering } from "@/lib/callSignal";

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
    await expect(sendToDoctor("order-1", "webrtc-answer", { answer: { type: "answer", sdp: "x" } })).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(PARTNER_CALL_SIGNAL_URL);
    expect((init.headers as Record<string, string>)["x-patient-token"]).toBe("patient-token");
    expect(JSON.parse(init.body as string)).toEqual({ orderId: "order-1", event: "webrtc-answer", payload: { answer: { type: "answer", sdp: "x" } } });
  });

  it("reports a refused message instead of throwing", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 403 }));
    await expect(sendToDoctor("order-1", "patient-ready")).resolves.toBe(false);
  });

  it("stops waiting for network routes after the timeout", async () => {
    vi.useFakeTimers();
    const pc = { iceGatheringState: "gathering", addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as RTCPeerConnection;
    const done = waitForIceGathering(pc, 1000);
    vi.advanceTimersByTime(1000);
    await expect(done).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
