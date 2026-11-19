import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Phone, PhoneOff, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  CallSession,
  callClock,
  getMicrophone,
  micErrorMessage,
  startRingback,
  stopRingback,
} from "@/lib/collection-call-session";

/**
 * "Call partner": the patient calls their collection partner through BloodLyn. It rings
 * in his BloodLyn Partner app (and as an alert on his phone), over the internet, so
 * neither side sees the other's phone number. The patient's app never dials his number.
 *
 * If he doesn't answer he gets a missed call to call back; the second missed call in an
 * hour also goes to the lab (collection-call does that).
 */

/** Keep in step with RING_SECONDS in supabase/functions/_shared/collection-call.ts. */
const RING_MS = 45_000;

type Phase =
  | { kind: "idle" }
  | { kind: "mic" }
  | { kind: "ringing" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "over"; tone: "ok" | "warn"; title: string; text?: string };

class CallError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

async function callFn<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("collection-call", {
    body,
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const payload =
      ctx && typeof ctx.json === "function"
        ? await ctx.json().catch(() => null)
        : null;
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : "Couldn't reach BloodLyn. Check the internet and try again.";
    throw new CallError(
      message,
      message === "unavailable" ? "unavailable" : undefined
    );
  }
  return data as T;
}

export function PartnerCallButton({
  orderId,
  partnerName,
  variant = "icon",
  className = "",
}: {
  orderId: string;
  partnerName?: string | null;
  variant?: "icon" | "button";
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const session = useRef<CallSession | null>(null);
  const callId = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef(phase.kind);
  phaseRef.current = phase.kind;
  const name = partnerName?.trim() || "Your collection partner";
  const first = name.split(/\s+/)[0];

  // The call clock.
  useEffect(() => {
    if (phase.kind !== "connected") return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase.kind]);

  // Leaving the screen ends the call.
  useEffect(
    () => () => {
      stopRingback();
      session.current?.hangup();
      if (callId.current)
        void callFn({ action: "hangup", callId: callId.current }).catch(
          () => {}
        );
    },
    []
  );

  const finish = (next: Phase, tell: "hangup" | "failed" | null) => {
    stopRingback();
    const id = callId.current;
    callId.current = null;
    session.current = null;
    setMuted(false);
    setPhase(next);
    if (id && tell)
      void callFn({
        action: "hangup",
        callId: id,
        failed: tell === "failed",
      }).catch(() => {});
  };

  const start = async () => {
    if (!["idle", "over"].includes(phaseRef.current)) return;
    setPhase({ kind: "mic" });
    let mic: MediaStream;
    try {
      mic = await getMicrophone();
    } catch (err) {
      toast.error(micErrorMessage(err));
      return setPhase({ kind: "idle" });
    }

    let started: {
      callId: string;
      room: string;
      iceServers: RTCIceServer[];
      ring_seconds?: number;
    };
    try {
      started = await callFn({ action: "call_partner", orderId });
    } catch (err) {
      mic.getTracks().forEach((t) => t.stop());
      if (err instanceof CallError && err.code === "unavailable") {
        return setPhase({
          kind: "over",
          tone: "warn",
          title: `${first} can't take app calls right now`,
          text: "We've told the lab, and they'll contact you shortly.",
        });
      }
      return setPhase({
        kind: "over",
        tone: "warn",
        title: "Couldn't call",
        text: err instanceof Error ? err.message : undefined,
      });
    }

    const id = started.callId;
    callId.current = id;
    setPhase({ kind: "ringing" });
    startRingback();
    const s = new CallSession({
      role: "caller",
      room: started.room,
      iceServers: started.iceServers,
      onRemoteAudio: (stream) => {
        if (audio.current) {
          audio.current.srcObject = stream;
          void audio.current.play().catch(() => {});
        }
      },
      onState: (state, reason) => {
        if (callId.current !== id) return;
        if (state === "connecting" || state === "connected") {
          stopRingback();
          setPhase({ kind: state });
        } else if (state === "ended") {
          finish({ kind: "over", tone: "ok", title: "Call ended" }, "hangup");
        } else if (state === "failed") {
          finish(
            {
              kind: "over",
              tone: "warn",
              title: "The call dropped",
              text: reason,
            },
            "failed"
          );
        }
      },
    });
    session.current = s;
    try {
      await s.start(mic);
    } catch (err) {
      s.hangup();
      return finish(
        {
          kind: "over",
          tone: "warn",
          title: "Couldn't connect",
          text: err instanceof Error ? err.message : undefined,
        },
        "failed"
      );
    }

    // While it rings: has he declined, or has it rung out?
    const ringFor = (started.ring_seconds ?? RING_MS / 1000) * 1000;
    const startedAt = Date.now();
    const poll = setInterval(async () => {
      if (callId.current !== id) return clearInterval(poll);
      const answered = ["connecting", "connected"].includes(phaseRef.current);
      if (Date.now() - startedAt > ringFor) {
        clearInterval(poll);
        if (!answered) {
          s.hangup();
          finish(
            {
              kind: "over",
              tone: "warn",
              title: `${first} didn't answer`,
              text: "He'll see your missed call and call you back. If he doesn't, we'll tell the lab.",
            },
            "hangup"
          );
        }
        return;
      }
      try {
        const { status } = await callFn<{ status: string }>({
          action: "call_status",
          callId: id,
        });
        if (status === "declined" && !answered) {
          clearInterval(poll);
          s.hangup();
          finish(
            {
              kind: "over",
              tone: "warn",
              title: `${first} is busy right now`,
              text: "He'll call you back in a few minutes.",
            },
            null
          );
        } else if (status !== "ringing") {
          clearInterval(poll);
        }
      } catch {
        /* keep ringing; the next check may get through */
      }
    }, 2000);
  };

  const hangUp = () => {
    session.current?.hangup();
    finish(
      phaseRef.current === "ringing"
        ? {
            kind: "over",
            tone: "ok",
            title: "Call cancelled",
            text: `${first} will see a missed call.`,
          }
        : { kind: "over", tone: "ok", title: "Call ended" },
      "hangup"
    );
  };

  const toggleMute = () => {
    const next = !muted;
    session.current?.mute(next);
    setMuted(next);
  };

  const busy = ["mic", "ringing", "connecting", "connected"].includes(
    phase.kind
  );
  const showCard = phase.kind !== "idle";

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          aria-label={`Call ${name}`}
          className={`w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 active:scale-95 transition disabled:opacity-60 ${className}`}
        >
          <Phone className="w-4.5 h-4.5" />
        </button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className={`gap-1.5 ${className}`}
          onClick={start}
          disabled={busy}
        >
          <Phone className="w-4 h-4" />
          Call Partner
        </Button>
      )}

      {/* At the page's root, so no animated section around the button can clip it. */}
      {createPortal(
        <>
          <audio ref={audio} autoPlay playsInline className="hidden" />
          <AnimatePresence>
            {showCard && (
              <motion.div
                initial={{ opacity: 0, transform: "translateY(-40px)" }}
                animate={{
                  opacity: 1,
                  transform: "translateY(0px)",
                  transitionEnd: { transform: "none" },
                }}
                exit={{ opacity: 0, transform: "translateY(-40px)" }}
                transition={{
                  transform: { type: "spring", stiffness: 500, damping: 28 },
                }}
                className="fixed inset-x-4 top-12 z-[100] mx-auto max-w-[400px] rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
                role="dialog"
                aria-label={`Calling ${name}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ${
                      phase.kind === "ringing" ? "animate-pulse" : ""
                    }`}
                  >
                    <Truck className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {phase.kind === "over" ? phase.title : name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {phase.kind === "mic"
                      ? "Allow the microphone…"
                      : phase.kind === "ringing"
                      ? "Ringing in his BloodLyn Partner app…"
                      : phase.kind === "connecting"
                      ? "Answered · connecting…"
                      : phase.kind === "connected"
                      ? `On call · ${callClock(seconds)}`
                      : phase.kind === "over"
                      ? phase.text || ""
                      : ""}
                  </p>

                  {phase.kind === "over" ? (
                    <button
                      type="button"
                      onClick={() => setPhase({ kind: "idle" })}
                      className="mt-6 h-12 w-full max-w-[240px] rounded-full bg-white/10 text-[15px] font-semibold text-white hover:bg-white/15"
                    >
                      Close
                    </button>
                  ) : (
                    <div className="mt-6 flex items-center justify-center gap-5">
                      {phase.kind === "connected" && (
                        <button
                          type="button"
                          onClick={toggleMute}
                          aria-label={muted ? "Unmute" : "Mute"}
                          className={`flex h-14 w-14 items-center justify-center rounded-full ${
                            muted
                              ? "bg-white text-gray-900"
                              : "bg-gray-800 text-white"
                          }`}
                        >
                          {muted ? (
                            <MicOff className="h-6 w-6" />
                          ) : (
                            <Mic className="h-6 w-6" />
                          )}
                        </button>
                      )}
                      {phase.kind !== "mic" && (
                        <button
                          type="button"
                          onClick={hangUp}
                          aria-label="End call"
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg hover:bg-red-600"
                        >
                          <PhoneOff className="h-6 w-6 text-white" />
                        </button>
                      )}
                    </div>
                  )}
                  {(phase.kind === "ringing" || phase.kind === "mic") && (
                    <p className="mt-4 text-[11px] text-gray-500">
                      Your number stays private. The call uses the internet.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}
