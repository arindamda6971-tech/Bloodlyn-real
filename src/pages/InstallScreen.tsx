import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Droplet, Zap, Download, Share, Check, Smartphone, Bell, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";

const InstallScreen = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWA();

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      navigate("/home");
    }
  };

  const features = [
    { icon: Smartphone, title: "Works offline", description: "Access your reports anytime" },
    { icon: Bell, title: "Push notifications", description: "Get instant updates on your tests" },
    { icon: Wifi, title: "Fast & reliable", description: "Loads quickly on any connection" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col w-full md:max-w-[430px] mx-auto">
      {/* Header */}
      <div className="pt-12 pb-8 px-6 text-center">
        <motion.div
          initial={false}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow">
            <Droplet className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
          </div>
          <Zap className="w-5 h-5 text-success -ml-3 -mt-6" />
        </motion.div>

        <motion.h1
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0}}
          className="text-2xl font-bold text-secondary mb-2"
        >
           Blood<span className="text-primary">Lyn</span>
        </motion.h1>

        <motion.p
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0}}
          className="text-muted-foreground"
        >
          Install for the best experience
        </motion.p>
      </div>

      {/* Features */}
      <motion.div
        initial={false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0}}
        className="flex-1 px-6 space-y-4"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={false}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0}}
            className="soft-card flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
            <Check className="w-5 h-5 text-success ml-auto" />
          </motion.div>
        ))}
      </motion.div>

      {/* Install Instructions / Button */}
      <motion.div
        initial={false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0}}
        className="px-6 pb-8 safe-area-bottom space-y-4"
      >
        {isInstalled ? (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full mb-4">
              <Check className="w-5 h-5" />
              <span className="font-medium">App installed!</span>
            </div>
            <Button onClick={() => navigate("/home")} variant="hero" size="lg" className="w-full">
               Open BloodLyn
            </Button>
          </div>
        ) : isIOS ? (
          <div className="glass-card rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-3">Install on iOS</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">1</div>
                <span>Tap the <Share className="w-4 h-4 inline text-primary" /> Share button below</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">2</div>
                <span>Scroll down and tap "Add to Home Screen"</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">3</div>
                <span>Tap "Add" to confirm</span>
              </div>
            </div>
          </div>
        ) : isInstallable ? (
          <Button onClick={handleInstall} variant="hero" size="lg" className="w-full">
            <Download className="w-5 h-5" />
             Install BloodLyn
          </Button>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-sm mb-4">
              Add this app to your home screen for quick access
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => navigate("/login")}
        >
          Continue in browser
        </Button>
      </motion.div>
    </div>
  );
};

export default InstallScreen;