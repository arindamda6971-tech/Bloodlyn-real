import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { onAppReady, openingAnimationWillShow } from "./lib/boot";

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

// Remove the HTML opening cover (index.html #bl-opening) once React has painted.
// On a session's first launch AppOpeningAnimation plays the exit itself, so this
// only acts on re-opens — or as a last-resort safety net (`force`).
function hideBootLoader(force = false) {
  if (openingAnimationWillShow && !force) return;
  const loader = document.getElementById("bl-opening");
  if (!loader) return;
  loader.style.transition = "opacity 220ms ease";
  loader.style.opacity = "0";
  loader.style.pointerEvents = "none";
  setTimeout(() => {
    if (loader.parentNode) loader.remove();
    SplashScreen.hide().catch(() => {});
  }, 230);
}

createRoot(document.getElementById("root")!).render(<App />);

// Hide the HTML cover when the first real screen is ready.
// (Timer fallback: some WebViews throttle animation frames during startup.)
onAppReady(() => {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    hideBootLoader();
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
  setTimeout(run, 150);
});
// Safety cap: never leave the user stranded on the cover, even if React fails.
setTimeout(() => hideBootLoader(true), 6000);
