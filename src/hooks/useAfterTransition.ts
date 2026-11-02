import { useEffect, useState } from "react";
import { whenTransitionSettled } from "@/lib/navigation-transition";

/**
 * False while the screen is still sliding in, then true.
 *
 * Screens that fetch on open should start after the slide: replies that land
 * mid-slide re-render the whole screen while it moves, which makes it judder
 * and swap content in with a blink. The page layer takes the transition gate
 * in its own effect, which runs after the screen's, so this waits one frame
 * before asking. The gate's watchdog releases it within 1.5 s at worst.
 */
export function useAfterTransition(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancel = () => {};
    const frame = requestAnimationFrame(() => {
      cancel = whenTransitionSettled(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancel();
    };
  }, []);

  return ready;
}
