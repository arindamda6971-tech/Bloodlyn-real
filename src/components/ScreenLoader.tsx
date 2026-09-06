import { Activity } from "lucide-react";

/**
 * Native-feeling localized screen loader.
 * Displays a minimal, unobtrusive pulse so it doesn't flash fake headers
 * during page transitions if Suspense is triggered.
 */
const ScreenLoader = () => {
  return (
    <div className="w-full h-full min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse">
        <Activity className="w-8 h-8 text-primary" />
      </div>
    </div>
  );
};

export default ScreenLoader;
