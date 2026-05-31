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

    // Hide splash screen after a short delay to ensure React has rendered
    const timer = setTimeout(() => {
      SplashScreen.hide();
    }, 1500);

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
