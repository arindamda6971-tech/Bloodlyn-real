import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";

/**
 * Sticky top banner shown when the device loses network connectivity.
 * Uses the browser's online/offline events — works in web and Capacitor builds.
 */
const OfflineBanner = () => {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 320 }}
          className="fixed top-0 left-0 right-0 z-[100] mx-auto w-full md:max-w-[430px] px-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
        >
          <div className="flex items-center gap-3 rounded-2xl bg-destructive text-destructive-foreground shadow-lg px-4 py-3">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">No internet connection</p>
              <p className="text-[11px] opacity-90 leading-tight">Please check your network and try again.</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
