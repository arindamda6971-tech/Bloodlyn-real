import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Clock3, FlaskConical, Loader2, MapPin, Mic, MicOff, Navigation, Phone, PhoneOff, ShieldCheck, Store, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { prettyDay, type CollectionDetails } from "../../supabase/functions/_shared/collection-link";
import {
  CallSession,
  callClock,
  getMicrophone,
  micErrorMessage,
  startRingback,
  stopRingback,
  type SessionState,
} from "@/lib/collection-call-session";

/**
 * The page a collection partner opens from the lab's WhatsApp message: the patient's
 * name, address with a map, time and tests, and "Call patient", which rings the
 * patient's BloodLyn app. Nobody's phone number is shown. No login: the link itself
 * is the key, and it stops working once the sample is collected.
 */

type View =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "closed"; reason: string; labName: string; labPhone: string }
  | { kind: "ready"; details: CollectionDetails; ringSeconds: number };

type Call =
  | { phase: "idle" }
  | { phase: "mic" }
  | { phase: "ringing"; callId: string }
  | { phase: SessionState; callId: string; reason?: string }
  | { phase: "missed" | "declined" | "error"; reason: string };

const CLOSED_REASON: Record<string, string> = {
  closed: "This collection is done or the booking is closed, so this link has stopped working.",
  expired: "This link has expired.",
  revoked: "The lab has sent this collection to someone else, so this link has stopped working.",
};

const invoke = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("collection-call", { body });
  if (error) {
    // The function's own message (e.g. "Too many calls") is in the response body.
    const ctx = (error as { context?: Response }).context;
    const message = ctx && typeof ctx.json === "function" ? await ctx.json().then((b: { error?: string }) => b?.error).catch(() => null) : null;
    throw new Error(message || "Couldn't reach BloodLyn. Check the internet and try again.");
  }
  return data as T;
};

const CollectionLinkScreen = () => {
  useSEO({ title: "Home collection | BloodLyn", description: "Home collection details for the collection partner." });
  const { token = "" } = useParams();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [call, setCall] = useState<Call>({ phase: "idle" });
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const session = useRef<CallSession | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  // The latest phase, for the ring timer (which runs outside React's render).
  const sessionPhase = useRef<string>("idle");
  sessionPhase.current = call.phase;

  useEffect(() => {
    let cancelled = false;
    invoke<{ state: string; details?: CollectionDetails; ring_seconds?: number; lab_name?: string; lab_phone?: string }>({ action: "view", token })
      .then((res) => {
        if (cancelled) return;
        if (res.state === "active" && res.details) setView({ kind: "ready", details: res.details, ringSeconds: res.ring_seconds ?? 45 });
        else setView({ kind: "closed", reason: CLOSED_REASON[res.state] ?? CLOSED_REASON.expired, labName: res.lab_name ?? "", labPhone: res.lab_phone ?? "" });
      })
      .catch(() => !cancelled && setView({ kind: "invalid" }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  // The call clock.
  useEffect(() => {
    if (call.phase !== "connected") return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [call.phase]);

  // Leaving the page ends the call.
  useEffect(
    () => () => {
      stopRingback();
      session.current?.hangup();
      if (callIdRef.current) void invoke({ action: "end", token, callId: callIdRef.current }).catch(() => {});
    },
    [token],
  );

  const finish = useCallback(
    (next: Call, tellServer: "end" | "failed" | null) => {
      stopRingback();
      const id = callIdRef.current;
      callIdRef.current = null;
      setCall(next);
      setMuted(false);
      if (id && tellServer) void invoke({ action: "end", token, callId: id, failed: tellServer === "failed" }).catch(() => {});
    },
    [token],
  );

  const startCall = async () => {
    if (view.kind !== "ready" || (call.phase !== "idle" && !["missed", "declined", "error", "ended", "failed"].includes(call.phase))) return;
    setCall({ phase: "mic" });
    let mic: MediaStream;
    try {
      mic = await getMicrophone();
    } catch (err) {
      return setCall({ phase: "error", reason: micErrorMessage(err) });
    }

    let started: { callId: string; room: string; iceServers: RTCIceServer[]; ring_seconds?: number };
    try {
      started = await invoke({ action: "start", token });
    } catch (err) {
      mic.getTracks().forEach((t) => t.stop());
      return setCall({ phase: "error", reason: err instanceof Error ? err.message : "Couldn't start the call." });
    }
    const { callId } = started;
    callIdRef.current = callId;
    setCall({ phase: "ringing", callId });
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
        if (state === "connecting" || state === "connected") {
          stopRingback();
          setCall({ phase: state, callId });
        } else if (state === "ended") {
          finish({ phase: "ended", callId, reason }, "end");
        } else if (state === "failed") {
          finish({ phase: "failed", callId, reason }, "failed");
        }
      },
    });
    session.current = s;
    try {
      await s.start(mic);
    } catch (err) {
      s.hangup();
      return finish({ phase: "error", reason: err instanceof Error ? err.message : "Couldn't start the call." }, "failed");
    }

    // While it rings: has the patient declined, or has it rung out?
    const ringFor = (started.ring_seconds ?? view.ringSeconds) * 1000;
    const startedAt = Date.now();
    const poll = setInterval(async () => {
      if (callIdRef.current !== callId) return clearInterval(poll);
      if (Date.now() - startedAt > ringFor) {
        clearInterval(poll);
        if (!["connecting", "connected"].includes(sessionPhase.current)) {
          s.hangup();
          finish({ phase: "missed", reason: "The patient didn't answer." }, "end");
        }
        return;
      }
      try {
        const { status } = await invoke<{ status: string }>({ action: "status", token, callId });
        if (status === "declined") {
          clearInterval(poll);
          s.hangup();
          finish({ phase: "declined", reason: "The patient is busy and declined the call." }, null);
        } else if (status === "accepted" || status === "ended" || status === "failed" || status === "missed") {
          clearInterval(poll);
          if (status === "missed") {
            s.hangup();
            finish({ phase: "missed", reason: "The patient didn't answer." }, null);
          }
        }
      } catch {
        /* keep ringing; the next check may get through */
      }
    }, 2000);
  };

  const hangUp = () => {
    session.current?.hangup();
    finish({ phase: "ended", callId: callIdRef.current ?? "", reason: "Call ended." }, "end");
  };

  const toggleMute = () => {
    const next = !muted;
    session.current?.mute(next);
    setMuted(next);
  };

  if (view.kind === "loading") {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (view.kind === "invalid") {
    return (
      <Shell>
        <Notice title="This link isn't valid" body="Please ask the lab to send the collection again on WhatsApp." />
      </Shell>
    );
  }

  if (view.kind === "closed") {
    return (
      <Shell>
        <Notice title="This link has stopped working" body={view.reason} />
        {view.labPhone && <LabCall name={view.labName} phone={view.labPhone} />}
      </Shell>
    );
  }

  const d = view.details;
  const when = [prettyDay(d.date), d.slot].filter(Boolean).join(" · ");
  const map = d.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}` : null;
  const busy = ["mic", "ringing", "connecting", "connected"].includes(call.phase);
  const ended = ["missed", "declined", "error", "ended", "failed"].includes(call.phase);

  return (
    <Shell>
      <audio ref={audio} autoPlay playsInline className="hidden" />

      <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/60">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Home collection{d.order_number ? ` · ${d.order_number}` : ""}</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground">{d.patient_name || "Patient"}</h1>
            {d.patient_meta && <p className="text-sm text-muted-foreground">{d.patient_meta}</p>}
          </div>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          {when && (
            <Row icon={Clock3} label="When">
              {when}
            </Row>
          )}
          {d.tests.length > 0 && (
            <Row icon={FlaskConical} label="Tests">
              {d.tests.join(", ")}
            </Row>
          )}
          {d.address && (
            <Row icon={MapPin} label="Address">
              {d.address}
            </Row>
          )}
          {d.lab_name && (
            <Row icon={Store} label="Lab">
              {d.lab_name}
            </Row>
          )}
        </dl>

        {map && (
          <a
            href={map}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background text-sm font-semibold text-foreground active:scale-[0.99]"
          >
            <Navigation className="h-4 w-4 text-primary" /> Open in Google Maps
          </a>
        )}
      </section>

      {/* Calling */}
      <section className="mt-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/60" aria-live="polite">
        {!busy && (
          <>
            <button
              type="button"
              onClick={startCall}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-600/25 active:scale-[0.99]"
            >
              <Phone className="h-5 w-5" /> {ended ? "Call again" : "Call patient"}
            </button>
            {ended && "reason" in call && call.reason && (
              <p className={`mt-3 text-center text-sm ${call.phase === "ended" ? "text-muted-foreground" : "text-rose-600"}`}>{call.reason}</p>
            )}
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              The call rings in the patient's BloodLyn app over the internet. Your number and theirs stay private.
            </p>
          </>
        )}

        {busy && (
          <div className="flex flex-col items-center py-2 text-center">
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                call.phase === "connected" ? "bg-emerald-100 text-emerald-700" : "animate-pulse bg-primary/10 text-primary"
              }`}
            >
              <Phone className="h-7 w-7" />
            </span>
            <p className="mt-3 text-lg font-bold text-foreground">{d.patient_name || "Patient"}</p>
            <p className="text-sm text-muted-foreground">
              {call.phase === "mic"
                ? "Allow the microphone…"
                : call.phase === "ringing"
                  ? "Ringing in the patient's BloodLyn app…"
                  : call.phase === "connecting"
                    ? "Answered · connecting…"
                    : `On call · ${callClock(seconds)}`}
            </p>
            <div className="mt-5 flex items-center gap-5">
              {call.phase === "connected" && (
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${muted ? "bg-foreground text-background" : "bg-muted text-foreground"}`}
                >
                  {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
              )}
              {call.phase !== "mic" && (
                <button
                  type="button"
                  onClick={hangUp}
                  aria-label="End call"
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
              )}
            </div>
            {call.phase === "connected" && <p className="mt-3 text-xs text-muted-foreground">Keep this page open while you talk.</p>}
          </div>
        )}
      </section>

      {d.lab_phone && (ended || call.phase === "idle") && <LabCall name={d.lab_name} phone={d.lab_phone} />}
    </Shell>
  );
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-muted/40">
      <header className="flex items-center gap-2 bg-background px-4 py-3 shadow-sm">
        <img src="/assets/images/logo-full.png" alt="BloodLyn" className="h-7 w-auto" width={64} height={28} />
        <span className="text-sm font-semibold text-muted-foreground">· Collection partner</span>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-4">{children}</main>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Clock3; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="break-words font-medium text-foreground">{children}</dd>
      </div>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-border/60">
      <p className="text-lg font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </section>
  );
}

/** If the patient doesn't pick up, the lab can help (it has the patient's details). */
function LabCall({ name, phone }: { name: string; phone: string }) {
  return (
    <a
      href={`tel:+91${phone}`}
      className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground"
    >
      <Phone className="h-4 w-4 text-primary" /> Call {name || "the lab"}
    </a>
  );
}

export default CollectionLinkScreen;
