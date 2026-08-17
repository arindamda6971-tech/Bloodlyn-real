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



  // --- Status bar theming (native only) ---
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;

    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;
        await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
        if (Capacitor.getPlatform() === "android") {
          // Match the app surface so the bar blends with the screen.
          await StatusBar.setBackgroundColor({
            color: theme === "dark" ? "#0B1220" : "#FFFFFF",
          });
        }
      } catch {
        // Plugin unavailable (web preview) — ignore.
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
