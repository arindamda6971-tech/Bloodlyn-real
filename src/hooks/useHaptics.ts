import { useCallback } from 'react';

/**
 * Haptic Feedback disabled as per user request.
 */
export const useHaptics = () => {
  const noop = useCallback(async () => {}, []);

  return {
    impactLight: noop,
    impactMedium: noop,
    notificationSuccess: noop,
    notificationError: noop,
    vibrate: noop,
  };
};
