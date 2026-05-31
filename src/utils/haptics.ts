export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    
    switch (style) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: 'SUCCESS' as any });
        break;
      case 'warning':
        await Haptics.notification({ type: 'WARNING' as any });
        break;
      case 'error':
        await Haptics.notification({ type: 'ERROR' as any });
        break;
    }
  } catch (err) {
    console.error('Haptics failed:', err);
  }
};
