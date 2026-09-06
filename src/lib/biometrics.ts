import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

/**
 * Prompts the user for biometric authentication (FaceID / Fingerprint) if available.
 * 
 * @param reason The message displayed to the user (e.g., "Authenticate to view your medical report")
 * @returns true if authenticated or skipped (web), false if cancelled or failed.
 */
export const authenticateBiometrically = async (reason: string): Promise<boolean> => {
  // If not running on a native device, gracefully bypass to not break local development
  if (!Capacitor.isNativePlatform()) {
    console.log(`[Biometric Mock] Bypassed check on web. Reason: ${reason}`);
    return true; 
  }

  try {
    const info = await BiometricAuth.checkBiometry();
    
    // If biometrics are not enrolled or available on this device, gracefully fall back to true 
    // (or we could force passcode, but the plugin handles passcode fallback natively if configured)
    if (!info.isAvailable) {
       console.log("[Biometric] Biometrics not available on this device. Bypassing.");
       return true;
    }

    const result = await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancel",
      allowDeviceCredential: true, // Allow PIN/Passcode fallback if face fails
    });

    return !result.hasError;
  } catch (error) {
    console.error("Biometric auth error:", error);
    // Fail closed on actual errors to ensure security isn't bypassed by bugs
    return false;
  }
};
