import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Phone, PhoneOff, Truck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startRingtone, stopRingtone } from "@/lib/ringtone";
import { CallSession, callClock, getMicrophone, micErrorMessage, type SessionState } from "@/lib/collection-call-session";
import { ALERT_EVENT, alertsRegistered, type AlertEventDetail } from "@/lib/push";

/**
 * The lab's collection partner calls from their WhatsApp link: the patient's app rings
 * ("Collection partner is calling"), they answer, and the two talk over the internet.
 * Neither sees the other's phone number.
 *
 * It rings here while the app is open (or opened within the ring time). With the app
 * closed, the phone rings through a call alert (lib/push.ts); tapping it opens the app,
 * which then rings here if the call is still on.
 */

/** Keep in step with RING_SECONDS in supabase/functions/_shared/collection-call.ts. */
const RING_MS = 45_000;

interface CallRow {
  id: string;
  status: string;
  created_at: string;
  caller_name: string | null;
  lab_name: string | null;
  /** "to_partner" rows are the patient's own calls to the partner: never ring for those. */
  direction?: string | null;
}

type Phase = { kind: "ringing" } | { kind: "joining" } | { kind: SessionState; reason?: string };

const answerFn = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("collection-call", { body });
  if (error) throw error;
  return data as { room: string; iceServers: RTCIceServer[] };
};

export function CollectionCallListener() {
  const { user } = useAuth();
  const [call, setCall] = useState<CallRow | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "ringing" });
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const callRef = useRef<CallRow | null>(null);
  const session = useRef<CallSession | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const handled = useRef(new Set<string>());

  const clear = useCallback(() => {
    stopRingtone();
    callRef.current = null;
    session.current = null;
    setCall(null);
    setMuted(false);
  }, []);

  const ring = useCallback((row: CallRow) => {
    if (row.direction === "to_partner" || handled.current.has(row.id) || callRef.current) return;
    if (row.status !== "ringing" || Date.now() - Date.parse(row.created_at) > RING_MS) return;
    handled.current.add(row.id);
    callRef.current = row;
    setCall(row);
    setPhase({ kind: "ringing" });
    // In the background the alert can't be seen: put a notification on the phone too,
    // unless this phone gets call alerts, which already ring with the app closed.
    if (Capacitor.isNativePlatform() && document.visibilityState === "hidden" && !alertsRegistered()) {
      LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1_000_000),
            title: "Your collection partner is calling",
            body: `${row.caller_name || "Collection partner"}${row.lab_name ? ` from ${row.lab_name}` : ""}. Open BloodLyn to answer.`,
            schedule: { at: new Date(Date.now() + 300) },
          },
        ],
      }).catch(() => {});
    }
  }, []);

  // Ring until answered, declined or rung out.
  useEffect(() => {
    if (!call || phase.kind !== "ringing") return;
    startRingtone();
    const left = RING_MS - (Date.now() - Date.parse(call.created_at));
    const timeout = setTimeout(() => clear(), Math.max(1000, left));
    return () => {
      clearTimeout(timeout);
      stopRingtone();
    };
  }, [call, phase.kind, clear]);

  // The call clock.
  useEffect(() => {
    if (phase.kind !== "connected") return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase.kind]);

  // A call that started while the app was closed or asleep still rings if it's recent.
  const checkForRinging = useCallback(async () => {
    if (!user?.id || callRef.current) return;
    const since = new Date(Date.now() - RING_MS).toISOString();
    const { data } = await (supabase.from("collection_calls" as never) as any)
      .select("id, status, created_at, caller_name, lab_name, direction")
      .eq("user_id", user.id)
      .eq("direction", "to_patient")
      .eq("status", "ringing")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    const row = (data as CallRow[] | null)?.[0];
    if (row) ring(row);
  }, [user?.id, ring]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`collection-calls-${user.id}`)
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "collection_calls", filter: `user_id=eq.${user.id}` },
        (payload: { new: CallRow }) => {
          const row = payload.new;
          if (!row?.id) return;
          if (row.status === "ringing") ring(row);
          // The partner gave up (missed / ended) before the patient answered.
          else if (callRef.current?.id === row.id && !session.current) clear();
        },
      )
      .subscribe();
    void checkForRinging();
    const onVisible = () => document.visibilityState === "visible" && void checkForRinging();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    // A call alert arrived with the app open, or was tapped: ring here if it still is.
    const onAlert = (e: Event) => {
      if ((e as CustomEvent<AlertEventDetail>).detail?.type === "collection_call") void checkForRinging();
    };
    window.addEventListener(ALERT_EVENT, onAlert);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(ALERT_EVENT, onAlert);
      supabase.removeChannel(channel);
    };
  }, [user?.id, ring, clear, checkForRinging]);

  const answer = async () => {
    const row = callRef.current;
    if (!row) return;
    stopRingtone();
    setPhase({ kind: "joining" });
    let mic: MediaStream;
    try {
      mic = await getMicrophone();
    } catch (err) {
      toast.error(micErrorMessage(err));
      void answerFn({ action: "decline", callId: row.id }).catch(() => {});
      return clear();
    }
    let joined: { room: string; iceServers: RTCIceServer[] };
    try {
      joined = await answerFn({ action: "answer", callId: row.id });
    } catch {
      mic.getTracks().forEach((t) => t.stop());
      toast.error("This call has already ended.");
      return clear();
    }
    const s = new CallSession({
      role: "callee",
      room: joined.room,
      iceServers: joined.iceServers,
      onRemoteAudio: (stream) => {
        if (audio.current) {
          audio.current.srcObject = stream;
          void audio.current.play().catch(() => {});
        }
      },
      onState: (state, reason) => {
        setPhase({ kind: state, reason });
        if (state === "ended" || state === "failed") {
          void answerFn({ action: "hangup", callId: row.id, failed: state === "failed" }).catch(() => {});
          if (state === "failed") toast.error(reason || "The call dropped.");
          setTimeout(clear, state === "failed" ? 0 : 1200);
        }
      },
    });
    session.current = s;
    try {
      await s.start(mic);
    } catch (err) {
      s.hangup();
      toast.error(err instanceof Error ? err.message : "Couldn't connect the call.");
    }
  };

  const decline = () => {
    const row = callRef.current;
    if (row) void answerFn({ action: "decline", callId: row.id }).catch(() => {});
    clear();
  };

  const hangUp = () => {
    if (session.current) session.current.hangup();
    else clear();
  };

  const toggleMute = () => {
    const next = !muted;
    session.current?.mute(next);
    setMuted(next);
  };

  const who = call?.caller_name || "Collection partner";
  const from = call?.lab_name ? `from ${call.lab_name}` : "for your home collection";
  const inCall = phase.kind !== "ringing";

  return (
    <>
      <audio ref={audio} autoPlay playsInline className="hidden" />
      <AnimatePresence>
        {call && (
          <motion.div
            initial={{ opacity: 0, transform: "translateY(-40px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)", transitionEnd: { transform: "none" } }}
            exit={{ opacity: 0, transform: "translateY(-40px)" }}
            transition={{ transform: { type: "spring", stiffness: 500, damping: 28 } }}
            className="fixed inset-x-4 top-12 z-[100] mx-auto max-w-[400px] rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
            role="dialog"
            aria-label={`${who} is calling`}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ${inCall ? "" : "animate-pulse"}`}>
                <Truck className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">{who}</h3>
              <p className="mt-1 text-sm text-gray-400">
                {phase.kind === "ringing"
                  ? `Your collection partner ${from} is calling`
                  : phase.kind === "joining" || phase.kind === "waiting" || phase.kind === "connecting"
                    ? "Connecting…"
                    : phase.kind === "connected"
                      ? `On call · ${callClock(seconds)}`
                      : phase.kind === "failed"
                        ? phase.reason || "The call dropped."
                        : "Call ended"}
              </p>

              {phase.kind === "ringing" ? (
                <div className="mt-6 flex w-full items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={decline}
                    aria-label="Decline"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-lg hover:bg-red-600"
                  >
                    <PhoneOff className="h-6 w-6 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={answer}
                    className="flex h-14 max-w-[240px] flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 text-[15px] font-bold text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-400/30 hover:bg-emerald-600"
                  >
                    <Phone className="h-5 w-5" /> Answer
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-center gap-5">
                  {phase.kind === "connected" && (
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={muted ? "Unmute" : "Mute"}
                      className={`flex h-14 w-14 items-center justify-center rounded-full ${muted ? "bg-white text-gray-900" : "bg-gray-800 text-white"}`}
                    >
                      {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </button>
                  )}
                  {phase.kind !== "ended" && phase.kind !== "failed" && (
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
              {phase.kind === "ringing" && <p className="mt-4 text-[11px] text-gray-500">Your number stays private. The call uses the internet.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
