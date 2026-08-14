import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { markAppReady } from "@/lib/boot";

/**
 * Marks the app "ready" (hides the HTML loader + native splash) as soon as a real
 * screen is mounted. The splash route signals readiness itself once it knows the
 * destination; this covers deep links / restored routes that skip the splash.
 */
const BootReadySignal = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/") return;
    const id = requestAnimationFrame(() => requestAnimationFrame(markAppReady));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
};

export default BootReadySignal;
