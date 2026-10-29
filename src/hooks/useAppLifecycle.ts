import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { onlineManager } from '@tanstack/react-query';
import { onAppReady, openingAnimationWillShow } from '@/lib/boot';

/**
 * Manages app-wide lifecycle events for native platforms.
 * Handles background/foreground transitions and prevents blank screens
 * by coordinating with the SplashScreen.
 */
export const useAppLifecycle = () => {
  useEffect(() => {
    // Configure React Query to use Capacitor's native network status
    onlineManager.setEventListener((setOnline) => {
      const listener = Network.addListener('networkStatusChange', (status) => {
        setOnline(status.connected);
      });
      return () => {
        listener.then(l => l.remove());
      };
    });

    if (!Capacitor.isNativePlatform()) return;

    // Safety net for the status-bar overlap: on native, env(safe-area-inset-top)
    // is 0 in the Android WebView and MainActivity injects the real inset a tick
    // later. Seed a sane default so the first painted frame never sits under the
    // status bar; the native listener overrides it with the exact value.
    const root = document.documentElement;
    if (!root.style.getPropertyValue('--safe-area-inset-top')) {
      root.style.setProperty('--safe-area-inset-top', '24px');
    }


    // No route is saved on background: a resume keeps the live app (and its
    // screen) in memory, while a fresh launch after the app was closed or killed
    // must start on Home, as large apps do (see SplashScreen).

    // The launch splash is already on screen (launchAutoHide: false). Calling
    // SplashScreen.show() here used to put up a *second*, differently sized
    // full-screen splash image on top of it, causing a visible logo "blink".
    //
    // Fallback hide once the first real screen is ready, for launches that skip
    // AppOpeningAnimation (which normally hides the splash itself).
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      SplashScreen.hide();
    };
    const offReady = openingAnimationWillShow
      ? () => {}
      : onAppReady(() => requestAnimationFrame(() => requestAnimationFrame(hide)));
    // Safety net so the splash can never get stuck.
    const timer = setTimeout(hide, 3000);


    // Listen for app state changes (Background/Foreground)
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App just came to foreground
        setTimeout(() => {
          SplashScreen.hide();
        }, 100);
      }
    });

    return () => {
      clearTimeout(timer);
      offReady();
      listener.then(l => l.remove());
    };
  }, []);
};
