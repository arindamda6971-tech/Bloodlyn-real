import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * One voice call between a collection partner (the caller, on the link page) and a
 * patient (the callee, in the BloodLyn app).
 *
 * KEEP IN STEP with partner-pro src/lib/collectionCallSession.ts (the partner's page on
 * the Partner Portal): only the Supabase client differs. The sound goes phone to phone (WebRTC);
 * the two phones swap the connection details over a Realtime channel named after the
 * call's secret room. Neither side learns the other's phone number.
 *
 * Handshake: the patient answers → keeps saying "accepted" until the caller sends an
 * offer → the patient answers it → both trade network routes (ICE) → connected.
 */

export type SessionState = "waiting" | "connecting" | "connected" | "ended" | "failed";

type Signal =
  | { type: "accepted" }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "hangup" };

export interface SessionOptions {
  role: "caller" | "callee";
  room: string;
  iceServers: RTCIceServer[];
  onState: (state: SessionState, reason?: string) => void;
  onRemoteAudio: (stream: MediaStream) => void;
}

/** Give up if the phones haven't connected this long after the patient answers. */
const CONNECT_TIMEOUT_MS = 25_000;
/** A dropped connection gets this long to come back before the call ends. */
const RECONNECT_GRACE_MS = 10_000;

/** The microphone, with the phone's echo and noise cancelling on. */
export function getMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error("This browser can't make calls. Please open the link in Chrome."));
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
}

export const micErrorMessage = (err: unknown) => {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Please allow the microphone to talk, then try again.";
  if (name === "NotFoundError") return "No microphone found on this phone.";
  return err instanceof Error && err.message ? err.message : "Couldn't use the microphone.";
};

export class CallSession {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private local: MediaStream | null = null;
  private pending: RTCIceCandidateInit[] = [];
  private offered = false;
  private answered = false;
  private finished = false;
  private state: SessionState = "waiting";
  private acceptTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private dropTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly opts: SessionOptions) {}

  /** Join the room with this microphone. The patient then tells the caller it answered. */
  async start(microphone: MediaStream) {
    this.local = microphone;
    const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers });
    this.pc = pc;
    microphone.getTracks().forEach((track) => pc.addTrack(track, microphone));
    pc.ontrack = (e) => this.opts.onRemoteAudio(e.streams[0] ?? new MediaStream([e.track]));
    pc.onicecandidate = (e) => {
      if (e.candidate) void this.send({ type: "ice", candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => this.onConnectionChange();

    this.channel = supabase.channel(`collection-call-${this.opts.room}`, { config: { broadcast: { self: false } } });
    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => void this.onSignal(payload as Signal));
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Couldn't reach the call server.")), 10_000);
      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(new Error("Couldn't reach the call server."));
        }
      });
    });

    if (this.opts.role === "callee") {
      // Say "answered" until the caller's offer arrives (the caller may join a moment later).
      this.setState("connecting");
      void this.send({ type: "accepted" });
      let tries = 0;
      this.acceptTimer = setInterval(() => {
        if (this.answered || ++tries > 12) return this.stopAcceptTimer();
        void this.send({ type: "accepted" });
      }, 1500);
      this.armConnectTimer();
    }
  }

  /** Mute or unmute this phone's microphone. */
  mute(muted: boolean) {
    this.local?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  /** End the call from this side. */
  hangup() {
    if (this.finished) return;
    void this.send({ type: "hangup" });
    this.finish("ended");
  }

  private async onSignal(msg: Signal) {
    const pc = this.pc;
    if (!pc || this.finished || !msg || typeof msg !== "object") return;
    try {
      if (msg.type === "accepted" && this.opts.role === "caller" && !this.offered) {
        this.offered = true;
        this.setState("connecting");
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await this.send({ type: "offer", sdp: { type: offer.type, sdp: offer.sdp } });
        this.armConnectTimer();
      } else if (msg.type === "offer" && this.opts.role === "callee" && !this.answered) {
        this.answered = true;
        this.stopAcceptTimer();
        await pc.setRemoteDescription(msg.sdp);
        await this.flushCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.send({ type: "answer", sdp: { type: answer.type, sdp: answer.sdp } });
      } else if (msg.type === "answer" && this.opts.role === "caller" && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(msg.sdp);
        await this.flushCandidates();
      } else if (msg.type === "ice" && msg.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(msg.candidate).catch(() => {});
        else this.pending.push(msg.candidate);
      } else if (msg.type === "hangup") {
        this.finish("ended", "The other side hung up.");
      }
    } catch (err) {
      console.warn("Call signal failed", err);
      this.fail("Couldn't connect the call.");
    }
  }

  private async flushCandidates() {
    const list = this.pending.splice(0);
    for (const c of list) await this.pc?.addIceCandidate(c).catch(() => {});
  }

  private onConnectionChange() {
    const s = this.pc?.connectionState;
    if (s === "connected") {
      if (this.connectTimer) clearTimeout(this.connectTimer);
      if (this.dropTimer) clearTimeout(this.dropTimer);
      this.dropTimer = null;
      this.setState("connected");
    } else if (s === "failed") {
      this.fail("The connection dropped.");
    } else if (s === "disconnected" && this.state === "connected" && !this.dropTimer) {
      // Mobile networks blip; give it a moment to come back.
      this.dropTimer = setTimeout(() => {
        if (this.pc?.connectionState !== "connected") this.fail("The connection dropped.");
      }, RECONNECT_GRACE_MS);
    }
  }

  private armConnectTimer() {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => {
      if (this.state !== "connected") this.fail("Couldn't connect. The internet on one of the phones may be weak.");
    }, CONNECT_TIMEOUT_MS);
  }

  private stopAcceptTimer() {
    if (this.acceptTimer) clearInterval(this.acceptTimer);
    this.acceptTimer = null;
  }

  private async send(msg: Signal) {
    if (!this.channel) return;
    try {
      await this.channel.send({ type: "broadcast", event: "signal", payload: msg });
    } catch {
      /* a lost signal is retried by the handshake or the timers */
    }
  }

  private setState(state: SessionState, reason?: string) {
    if (this.finished && state !== "ended" && state !== "failed") return;
    this.state = state;
    this.opts.onState(state, reason);
  }

  private fail(reason: string) {
    if (this.finished) return;
    void this.send({ type: "hangup" });
    this.finish("failed", reason);
  }

  private finish(state: "ended" | "failed", reason?: string) {
    if (this.finished) return;
    this.finished = true;
    this.stopAcceptTimer();
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.dropTimer) clearTimeout(this.dropTimer);
    this.local?.getTracks().forEach((t) => t.stop());
    try {
      this.pc?.close();
    } catch {
      /* already closed */
    }
    const channel = this.channel;
    // Let the last "hangup" go out before leaving the room.
    if (channel) setTimeout(() => void supabase.removeChannel(channel), 500);
    this.state = state;
    this.opts.onState(state, reason);
  }
}

// ── The caller's "tring-tring" while the patient's phone rings ──────────────

let ringbackCtx: AudioContext | null = null;
let ringbackTimer: ReturnType<typeof setInterval> | null = null;

/** Two short tones every three seconds, like a phone ringing on the other side. */
export function startRingback() {
  stopRingback();
  const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  ringbackCtx = new Ctx();
  const ring = () => {
    const ac = ringbackCtx;
    if (!ac) return;
    const t0 = ac.currentTime + 0.02;
    [0, 0.6].forEach((offset) => {
      const osc = ac.createOscillator();
      const osc2 = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = 400;
      osc2.frequency.value = 450;
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + offset + 0.03);
      gain.gain.setValueAtTime(0.12, t0 + offset + 0.37);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.4);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0 + offset);
      osc2.start(t0 + offset);
      osc.stop(t0 + offset + 0.42);
      osc2.stop(t0 + offset + 0.42);
    });
  };
  ring();
  ringbackTimer = setInterval(ring, 3000);
}

export function stopRingback() {
  if (ringbackTimer) clearInterval(ringbackTimer);
  ringbackTimer = null;
  void ringbackCtx?.close().catch(() => {});
  ringbackCtx = null;
}

/** "02:07" */
export const callClock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
