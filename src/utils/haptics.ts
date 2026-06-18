import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Utility for triggering haptic feedback on mobile devices.
 * Safely checks if the platform is native before calling Capacitor plugins.
 */
export const hapticImpact = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Ignore haptic errors
    }
  }
};

/**
 * Backward compatible alias for hapticImpact
 */
export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  const map = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  hapticImpact(map[style]);
};

export const hapticSelection = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.selectionStart();
      setTimeout(async () => {
        await Haptics.selectionEnd();
      }, 50);
    } catch (e) {
      // Ignore haptic errors
    }
  }
};

export const hapticNotification = async (type: 'SUCCESS' | 'WARNING' | 'ERROR') => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Map string to enum-like behavior if needed, or use directly if supported
      // Capacitor Haptics.notification uses a specific type
      const notificationTypeMap = {
        SUCCESS: 'SUCCESS',
        WARNING: 'WARNING',
        ERROR: 'ERROR',
      } as const;

      // Haptics.notification({ type: notificationTypeMap[type] });
    } catch (e) {
      // Ignore haptic errors
    }
  }
};
