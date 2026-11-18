import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";

const InstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWA();
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("pwa-install-dismissed") === "true";
  });

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if already installed, dismissed, or not installable (and not iOS)
  if (isInstalled || isDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, transform: "translateY(100px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)", transitionEnd: { transform: "none" } }}
        transition={{ transform: { type: "spring", stiffness: 500, damping: 25, restSpeed: 10 } }}
        exit={{ opacity: 0, transform: "translateY(100px)" }}
        className="fixed bottom-20 left-4 right-4 max-w-[398px] mx-auto z-50"
      >
        <div className="glass-card rounded-2xl p-4 shadow-lg">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-primary-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-1">
                 Install BloodLyn
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {isIOS
                  ? "Tap Share, then 'Add to Home Screen' for the best experience"
                  : "Get quick access to health tests, reports, and more"}
              </p>

              {isIOS ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Share className="w-4 h-4" />
                  <span>Tap Share → Add to Home Screen</span>
                </div>
              ) : (
                <Button onClick={handleInstall} size="sm" variant="soft">
                  <Download className="w-4 h-4" />
                  Install App
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;