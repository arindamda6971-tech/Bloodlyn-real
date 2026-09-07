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
          // Logged in → attempt to restore last route, otherwise go to home
          localStorage.setItem(ONBOARDED_KEY, "1");
          
          const lastRoute = localStorage.getItem('bloodlyn_last_route');
          if (lastRoute) {
            // Clear immediately to prevent boot loops if the route crashes
            localStorage.removeItem('bloodlyn_last_route');
            
            // Whitelist of routes safe to restore (ignore checkout flows, auth, etc)
            const safeToRestore = /^\/(home|categories|reports|profile|bookings|category-tests|test|lab|report-detail|tracking)/;
            if (safeToRestore.test(lastRoute)) {
              return lastRoute;
            }
          }
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
        initial={false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px hsl(201 88% 62% / 0.2)",
              "0 0 40px hsl(201 88% 62% / 0.4)",
              "0 0 20px hsl(201 88% 62% / 0.2)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6"
        >
          <div className="relative">
            <Droplet className="w-12 h-12 text-primary-foreground fill-primary-foreground" />
            <motion.div
              initial={false}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center"
            >
              <Zap className="w-3 h-3 text-success-foreground" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-secondary mb-2"
        >
          Blood<span className="text-primary">Lyn</span>
        </motion.h1>

        <motion.p
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-center font-medium"
        >
          Diagnostics. Faster. Smarter.
        </motion.p>
      </motion.div>

      <motion.div
        initial={false}
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
