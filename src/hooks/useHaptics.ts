import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Native Haptic Feedback hook.
 * Only triggers on native devices to avoid console noise in web.
 */
export const useHaptics = () => {
  const isNative = Capacitor.isNativePlatform();

  const impactLight = useCallback(async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  }, [isNative]);

  const impactMedium = useCallback(async () => {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  }, [isNative]);

  const notificationSuccess = useCallback(async () => {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Success });
    }
  }, [isNative]);

  const notificationError = useCallback(async () => {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Error });
    }
  }, [isNative]);

  const vibrate = useCallback(async () => {
    if (isNative) {
      await Haptics.vibrate();
    }
  }, [isNative]);

  return {
    impactLight,
    impactMedium,
    notificationSuccess,
    notificationError,
    vibrate
  };
};
