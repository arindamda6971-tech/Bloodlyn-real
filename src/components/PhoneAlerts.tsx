import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ALERT_EVENT, startAlerts, type AlertEventDetail } from "@/lib/push";

/**
 * Call alerts for the signed-in patient: signs this phone up when notifications are
 * already allowed (never asks by itself), and opens the screen a tapped alert is about.
 * The ringing screens (IncomingCallListener, CollectionCallListener) ring from there.
 */
export function PhoneAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Listening before the alerts start, so a tap that opened the app isn't missed.
  useEffect(() => {
    const onAlert = (e: Event) => {
      const alert = (e as CustomEvent<AlertEventDetail>).detail;
      if (alert?.tapped && alert.route) navigate(alert.route);
    };
    window.addEventListener(ALERT_EVENT, onAlert);
    return () => window.removeEventListener(ALERT_EVENT, onAlert);
  }, [navigate]);

  useEffect(() => {
    if (!user?.id) return;
    startAlerts().catch((err) => console.error("Call alerts didn't start:", err));
  }, [user?.id]);

  return null;
}

export default PhoneAlerts;
