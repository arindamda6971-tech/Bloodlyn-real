import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { onAppReady } from "./lib/boot";

// One-time migration: clear legacy caches (e.g. old Firebase code) exactly once
// per browser. Guarded by localStorage so the workbox precache and font caches
// aren't wiped on every launch (which would break offline/PWA behavior).
const CACHE_MIGRATION_KEY = "bl_cache_migration_v1";

async function runOneTimeCacheMigration() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(CACHE_MIGRATION_KEY)) return;
  } catch {
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        // Only purge legacy caches; leave workbox precache/font caches intact.
        const legacy = cacheNames.filter((n) =>
          /firebase|old|legacy/i.test(n)
        );
        await Promise.all(legacy.map((n) => caches.delete(n)));
      }
    } catch (error) {
      console.log('Service worker migration:', error);
    }
  }

  try {
    localStorage.setItem(CACHE_MIGRATION_KEY, "1");
  } catch {
    /* ignore */
  }
}

// Memory optimization for Android devices
function setupMemoryManagement() {
  if (typeof window !== "undefined") {
    CapacitorApp.addListener('appRestoredResult', (data) => {
      console.log('Restored state after being killed by OS:', data);
    });
  }
}

runOneTimeCacheMigration();
setupMemoryManagement();

// Remove the static HTML loader the moment React has painted its first frame.
function hideBootLoader() {
  const loader = document.getElementById("app-loading-screen");
  if (!loader) return;
  loader.style.transition = "opacity 220ms ease";
  loader.style.opacity = "0";
  setTimeout(() => {
    if (loader.parentNode) loader.remove();
    // Also hide the native splash screen if it's still up
    SplashScreen.hide().catch(() => {});
  }, 230);
}
(window as unknown as { __blHideLoader?: () => void }).__blHideLoader = hideBootLoader;

createRoot(document.getElementById("root")!).render(<App />);

// Hide the HTML loader when the first real screen is ready.
onAppReady(() => requestAnimationFrame(() => requestAnimationFrame(hideBootLoader)));
// Safety cap: never leave the user stranded on the loader.
setTimeout(hideBootLoader, 3500);
