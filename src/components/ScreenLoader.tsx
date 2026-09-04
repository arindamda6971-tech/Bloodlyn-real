import { Loader2 } from "lucide-react";

/**
 * Native-feeling localized screen loader.
 * Displays a sleek spinner while the lazy route chunk is fetched.
 */
const ScreenLoader = () => {
  return (
    <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-60" />
      <span className="mt-4 text-sm text-muted-foreground animate-pulse font-medium">
        Loading screen...
      </span>
    </div>
  );
};

export default ScreenLoader;
