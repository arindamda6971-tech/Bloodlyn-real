import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from '@capacitor/app';

// Force update service worker and clear old caches on load
async function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
      // Clear all caches to remove any old Firebase code
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
    } catch (error) {
      console.log('Service worker update:', error);
    }
  }
}

// Memory optimization for Android devices
function setupMemoryManagement() {
  if (typeof window !== "undefined") {
    // Listen for low memory events from native platform
    CapacitorApp.addListener('appRestoredResult', (data) => {
      console.log('Restored state after being killed by OS:', data);
    });
  }
}

// Remove any debug controls injected at runtime (e.g. "Hide debug" button)
// This operates at the DOM level so we don't change UI component files.
function removeDebugControls() {
	const matchesDebugText = (text: string | null | undefined) => {
		if (!text) return false;
		const t = text.trim().toLowerCase();
		return t === "hide debug" || t === "hide-debug" || t === "debug";
	};

	const cleanup = () => {
		document.querySelectorAll("button, a, div, span").forEach((el) => {
			if (matchesDebugText(el.textContent)) {
				el.remove();
			}
		});
	};

	// Initial pass
	if (typeof document !== "undefined") {
		cleanup();

		// Observe future additions and remove if they appear
		const mo = new MutationObserver(() => cleanup());
		mo.observe(document.body, { childList: true, subtree: true });
	}
}

// Update service worker first
updateServiceWorker();
setupMemoryManagement();

createRoot(document.getElementById("root")!).render(<App />);

// Run after initial render to catch any debug UI inserted by dev helpers
setTimeout(removeDebugControls, 50);
