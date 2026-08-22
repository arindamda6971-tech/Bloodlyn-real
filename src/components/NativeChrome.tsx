import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Step 7 — native chrome integration.
 *
 * 1. Status bar style follows the active app theme (dark content on the light
 *    theme, light content on the dark theme) and matches the app background so
 *    the system bar never looks like a foreign strip.
 * 2. Keyboard-aware focus: scrolls the focused field into view inside the
 *    app's scroll container, matching native form behaviour.
 *
 * Purely presentational — no data, auth or edge-function surface touched.
 */
const NativeChrome = () => {
  const { theme } = useTheme();

  // Flag the document so CSS can drop WebView-expensive effects on native.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    document.documentElement.classList.add("native");
    return () => document.documentElement.classList.remove("native");
  }, []);



  // --- Status bar theming & Safe Area injection (native only) ---
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;

    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;

        // Ensure status bar is overlays the webview for a truly native look
        await StatusBar.setOverlaysWebView({ overlay: true });

        await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });

        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({
            color: "#00000000", // Transparent to show the app background
          });

          // Inject a standard Android status bar height as the default inset.
          // This ensures headers clear the battery/clock on most modern devices.
          document.documentElement.style.setProperty('--safe-area-inset-top', '38px');
        }
      } catch {
        // Plugin unavailable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [theme]);

  // --- Keyboard: keep the focused field visible ---
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;

      // Wait for the keyboard/resize to settle, then reveal the field.
      window.setTimeout(() => {
        if (document.activeElement !== target) return;
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 250);
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return null;
};

export default NativeChrome;
