import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

/**
 * Manages app-wide lifecycle events for native platforms.
 * Handles background/foreground transitions and prevents blank screens
 * by coordinating with the SplashScreen.
 */
export const useAppLifecycle = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Persist current route to handle cold starts after process kill
    const saveCurrentRoute = () => {
      localStorage.setItem('bloodlyn_last_route', window.location.pathname + window.location.search);
    };

    // Show splash screen on startup and hide it only when app is ready
    SplashScreen.show({
      autoHide: false,
    });

    // Hide the native splash as soon as React has actually painted a frame
    // (double rAF = after layout + paint) instead of a fixed 1.5s wait.
    // The timeout is only a safety net if rAF is throttled in background.
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      SplashScreen.hide();
    };
    requestAnimationFrame(() => requestAnimationFrame(hide));
    const timer = setTimeout(hide, 1500);


    // Listen for app state changes (Background/Foreground)
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App just came to foreground
        setTimeout(() => {
          SplashScreen.hide();
        }, 100);
      } else {
        // App went to background
        saveCurrentRoute();
        console.log('App going to background - state saved.');
      }
    });

    return () => {
      clearTimeout(timer);
      listener.then(l => l.remove());
    };
  }, []);
};
