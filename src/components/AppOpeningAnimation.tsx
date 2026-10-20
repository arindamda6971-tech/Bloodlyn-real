import React, { useEffect, useRef } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { onAppReady } from "@/lib/boot";

interface AppOpeningAnimationProps {
  onComplete?: () => void;
  /** Minimum time the opening plays before it may leave, in ms. */
  durationMs?: number;
}

/** Never hold the user on the opening longer than this after React mounts. */
const MAX_WAIT_MS = 2600;
/** Must match the `.bl-open--exit` animation length in index.html. */
const EXIT_MS = 320;

/**
 * Exit controller for the app opening.
 *
 * The opening itself (logo, heartbeat ring, wordmark) is plain HTML/CSS in
 * index.html (#bl-opening), so it starts the moment the page is parsed instead
 * of waiting for the JavaScript bundle. This component only decides when it
 * leaves: once Home is ready AND the heartbeat has had time to play, it adds
 * the exit class (fade out + logo eases forward) and removes the element.
 */
export const AppOpeningAnimation: React.FC<AppOpeningAnimationProps> = ({
  onComplete,
  durationMs = 1500,
}) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const el = document.getElementById("bl-opening");
    // Fallback in case the inline handover in index.html could not reach the plugin.
    SplashScreen.hide().catch(() => {});
    if (!el) {
      onCompleteRef.current?.();
      return;
    }

    let minElapsed = false;
    let appReady = false;
    let started = false;
    let completeTimer: ReturnType<typeof setTimeout> | undefined;

    const startExit = () => {
      if (started) return;
      started = true;
      el.classList.add("bl-open--exit");
      completeTimer = setTimeout(() => {
        el.remove();
        onCompleteRef.current?.();
      }, EXIT_MS);
    };
    const maybeExit = () => {
      if (minElapsed && appReady) startExit();
    };

    // Count the minimum from when the opening actually started playing (set by
    // index.html), which can be after React mounts if the logo decodes slowly.
    let minTimer: ReturnType<typeof setTimeout> | undefined;
    const checkMin = () => {
      const playStart = (window as unknown as { __blOpeningStart?: number }).__blOpeningStart;
      if (typeof playStart !== "number") {
        minTimer = setTimeout(checkMin, 50);
        return;
      }
      const remaining = durationMs - (performance.now() - playStart);
      if (remaining > 0) {
        minTimer = setTimeout(checkMin, remaining);
        return;
      }
      minElapsed = true;
      maybeExit();
    };
    checkMin();

    const offReady = onAppReady(() => {
      // Give Home a couple of frames to paint before revealing it (timer as a
      // fallback for WebViews that throttle animation frames).
      const markReady = () => {
        if (appReady) return;
        appReady = true;
        maybeExit();
      };
      requestAnimationFrame(() => requestAnimationFrame(markReady));
      setTimeout(markReady, 150);
    });
    const maxTimer = setTimeout(startExit, MAX_WAIT_MS);

    return () => {
      if (minTimer) clearTimeout(minTimer);
      clearTimeout(maxTimer);
      if (completeTimer) clearTimeout(completeTimer);
      offReady();
    };
  }, [durationMs]); // Never depend on onComplete so parent re-renders can't reset timers.

  return null;
};

export default AppOpeningAnimation;
