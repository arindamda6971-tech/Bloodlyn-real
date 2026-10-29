import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { markAppReady } from "@/lib/boot";

const ONBOARDED_KEY = "bloodlyn-onboarded";
const LEGACY_LAST_ROUTE_KEY = "bloodlyn_last_route";

/**
 * Silent Auth Gateway for Route "/".
 * Seamlessly resolves destination (/home, /login, or /onboarding)
 * in the background while AppOpeningAnimation provides the brand experience.
 */
const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const resolveDestination = async (): Promise<string> => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          localStorage.setItem(ONBOARDED_KEY, "1");
          // A fresh launch always opens Home, never the screen left before the
          // app was closed. Older versions saved that screen; drop the leftover.
          localStorage.removeItem(LEGACY_LAST_ROUTE_KEY);
          return "/home";
        }
      } catch {
        /* ignore */
      }
      const onboarded = localStorage.getItem(ONBOARDED_KEY) === "1";
      return onboarded ? "/login" : "/onboarding";
    };

    resolveDestination().then((dest) => {
      if (cancelled) return;
      markAppReady();
      navigate(dest, { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center w-full md:max-w-[430px] mx-auto select-none" />
  );
};

export default SplashScreen;
