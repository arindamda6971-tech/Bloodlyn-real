import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Two fake phones in one test: an in-memory Realtime room and a minimal WebRTC
 * connection, to check the call handshake connects both sides, including when the
 * caller joins the room after the patient has answered.
 */

type Handler = (msg: { payload: unknown }) => void;
const rooms = vi.hoisted(() => new Map<string, Set<{ handler: Handler }>>());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (name: string) => {
      const member: { handler: Handler } = { handler: () => {} };
      const channel = {
        on: (_type: string, _filter: unknown, handler: Handler) => {
          member.handler = handler;
          return channel;
        },
        subscribe: (cb: (status: string) => void) => {
          if (!rooms.has(name)) rooms.set(name, new Set());
          rooms.get(name)!.add(member);
          setTimeout(() => cb("SUBSCRIBED"), 0);
          return channel;
        },
        send: async ({ payload }: { payload: unknown }) => {
          for (const other of rooms.get(name) ?? []) if (other !== member) setTimeout(() => other.handler({ payload }), 0);
          return "ok";
        },
        _leave: () => rooms.get(name)?.delete(member),
      };
      return channel;
    },
    removeChannel: async (channel: { _leave: () => void }) => channel._leave(),
  },
}));

class FakePeer {
  static all: FakePeer[] = [];
  connectionState = "new";
  signalingState = "stable";
  localDescription: unknown = null;
  remoteDescription: unknown = null;
  ontrack: ((e: { streams: unknown[]; track: unknown }) => void) | null = null;
  onicecandidate: ((e: { candidate: unknown }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  constructor() {
    FakePeer.all.push(this);
  }
  addTrack() {}
  async createOffer() {
    return { type: "offer", sdp: "offer-sdp" };
  }
  async createAnswer() {
    return { type: "answer", sdp: "answer-sdp" };
  }
  async setLocalDescription(d: { type: string }) {
    this.localDescription = d;
    this.signalingState = d.type === "offer" ? "have-local-offer" : "stable";
    this.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: "candidate:1", sdpMid: "0" }) } });
    this.maybeConnect();
  }
  async setRemoteDescription(d: unknown) {
    this.remoteDescription = d;
    this.signalingState = "stable";
    this.maybeConnect();
  }
  async addIceCandidate() {}
  close() {
    this.connectionState = "closed";
  }
  private maybeConnect() {
    if (this.localDescription && this.remoteDescription && this.connectionState === "new") {
      this.connectionState = "connected";
      this.ontrack?.({ streams: ["remote-stream"], track: {} });
      setTimeout(() => this.onconnectionstatechange?.(), 0);
    }
  }
}

const mic = () => ({ getTracks: () => [{ stop: vi.fn() }], getAudioTracks: () => [{ enabled: true }] }) as unknown as MediaStream;
const settle = (ms = 200) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  rooms.clear();
  FakePeer.all = [];
  vi.stubGlobal("RTCPeerConnection", FakePeer);
});

const makeSide = async (role: "caller" | "callee", room = "room-1") => {
  const { CallSession } = await import("@/lib/collection-call-session");
  const states: string[] = [];
  const audio: unknown[] = [];
  const session = new CallSession({
    role,
    room,
    iceServers: [],
    onState: (s) => states.push(s),
    onRemoteAudio: (s) => audio.push(s),
  });
  return { session, states, audio };
};

describe("collection call handshake", () => {
  it("connects the partner and the patient, and both hear each other", async () => {
    const caller = await makeSide("caller");
    const callee = await makeSide("callee");
    await caller.session.start(mic());
    await callee.session.start(mic());
    await settle();
    expect(caller.states).toContain("connected");
    expect(callee.states).toContain("connected");
    expect(caller.audio).toHaveLength(1);
    expect(callee.audio).toHaveLength(1);
  });

  it("still connects when the partner joins after the patient answered", async () => {
    const callee = await makeSide("callee");
    await callee.session.start(mic());
    await settle();
    const caller = await makeSide("caller");
    await caller.session.start(mic());
    // The patient keeps saying "answered" every 1.5 s until the offer arrives.
    await settle(1700);
    expect(caller.states).toContain("connected");
    expect(callee.states).toContain("connected");
  });

  it("ends the call on both phones when one hangs up", async () => {
    const caller = await makeSide("caller");
    const callee = await makeSide("callee");
    await caller.session.start(mic());
    await callee.session.start(mic());
    await settle();
    callee.session.hangup();
    await settle();
    expect(callee.states.at(-1)).toBe("ended");
    expect(caller.states.at(-1)).toBe("ended");
  });
});
