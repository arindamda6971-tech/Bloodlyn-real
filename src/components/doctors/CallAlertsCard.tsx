import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { alertsState, startAlerts, turnOnAlerts, type AlertsState } from "@/lib/push";

/**
 * On an upcoming consultation, when this phone can't ring for the doctor's call yet:
 * asks to allow call alerts, or says where to turn notifications back on. Hidden when
 * the phone already rings, and on the web or a build without call alerts.
 */
export function CallAlertsCard() {
  const [state, setState] = useState<AlertsState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const check = () =>
      alertsState()
        .then(async (s) => {
          // Turned on in Settings and back in the app: sign the phone up now.
          if (s === "on") await startAlerts();
          if (live) setState(s);
        })
        .catch(() => live && setState("unsupported"));
    void check();
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!state || state === "unsupported" || state === "on") return null;

  const allow = async () => {
    setBusy(true);
    try {
      setState(await turnOnAlerts());
    } catch (err) {
      console.error("Couldn't turn on call alerts:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex items-start gap-3 rounded-3xl border border-amber-500/25 bg-amber-500/5 p-4" aria-live="polite">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <BellRing className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">Let your phone ring when the doctor calls</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {state === "blocked"
            ? "Notifications are off for BloodLyn, so the call only rings while the app is open. Turn them on in your phone's Settings › Apps › BloodLyn › Notifications."
            : "Without this, the call only rings while BloodLyn is open."}
        </p>
        {state === "off" && (
          <Button size="sm" className="mt-3 h-9 rounded-xl px-4 font-bold" onClick={allow} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Allow call alerts"}
          </Button>
        )}
      </div>
    </section>
  );
}

export default CallAlertsCard;
