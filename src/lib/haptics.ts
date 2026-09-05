import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const hapticImpact = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      console.error('Haptics impact failed', e);
    }
  }
};

export const hapticNotification = async (type: NotificationType = NotificationType.Success) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.notification({ type });
    } catch (e) {
      console.error('Haptics notification failed', e);
    }
  }
};

export const hapticSelection = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (e) {
      console.error('Haptics selection failed', e);
    }
  }
};
