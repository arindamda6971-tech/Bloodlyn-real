import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Droplet, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { markAppReady } from "@/lib/boot";

const ONBOARDED_KEY = "bloodlyn-onboarded";
/** Shortest time the brand frame stays up so it never "blinks" on fast cold starts. */
const MIN_SPLASH_MS = 450;

const SplashScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const resolveDestination = async (): Promise<string> => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          // Logged in → straight to home (skip onboarding entirely)
          localStorage.setItem(ONBOARDED_KEY, "1");
          return "/home";
        }
      } catch {
        /* ignore */
      }
      const onboarded = localStorage.getItem(ONBOARDED_KEY) === "1";
      return onboarded ? "/login" : "/onboarding";
    };

    // Fill the bar with a single CSS-driven step instead of a 10-tick interval.
    const fill = requestAnimationFrame(() => setProgress(100));

    // Kick the session lookup off immediately — the destination is known as soon
    // as Supabase answers, not after a fixed ~900ms animation.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    resolveDestination().then((dest) => {
      if (cancelled) return;
      const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt));
      timeout = setTimeout(() => {
        if (cancelled) return;
        markAppReady();
        navigate(dest, { replace: true });
      }, wait);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(fill);
      if (timeout) clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 w-full md:max-w-[430px] mx-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px hsl(201 88% 62% / 0.0)",
              "0 0 40px hsl(201 88% 62% / 0.1)",
              "0 0 20px hsl(201 88% 62% / 0.0)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center justify-center mb-6 mt-12"
        >
          <img src="/assets/images/logo-full.png" alt="BloodLyn" className="h-28 w-auto object-contain" />
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-center font-medium mt-4"
        >
          Diagnostics. Faster. Smarter.
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-20 left-8 right-8"
      >
        <div className="progress-track">
          <motion.div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Loading your health companion...
        </p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
