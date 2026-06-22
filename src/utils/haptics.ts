import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
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
  if (!Capacitor.isNativePlatform()) return;
  try {
    const map: Record<'SUCCESS' | 'WARNING' | 'ERROR', NotificationType> = {
      SUCCESS: NotificationType.Success,
      WARNING: NotificationType.Warning,
      ERROR: NotificationType.Error,
    };
    await Haptics.notification({ type: map[type] });
  } catch (e) {
    // Ignore haptic errors
  }
};

/**
 * Backward compatible alias for hapticImpact / hapticNotification
 */
export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  const impactMap = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  } as const;
  if (style === 'success' || style === 'warning' || style === 'error') {
    hapticNotification(style.toUpperCase() as 'SUCCESS' | 'WARNING' | 'ERROR');
    return;
  }
  hapticImpact(impactMap[style]);
};
