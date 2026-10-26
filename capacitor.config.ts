import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d",
  appName: "BloodLyn",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
    webContentsDebuggingEnabled: false,
    captureInput: false,
    useLegacyBridge: false,
    buildOptions: {
      releaseType: "APK",
    },
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: "LIGHT",
      backgroundColor: "#00000000",
    },
    SplashScreen: {
      // The system splash is a plain white screen (styles.xml uses an empty icon).
      // Keep it up until the HTML opening in index.html has painted, which then
      // hides it, so there is no gap and no second splash before the animation.
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 120,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_bloodlyn",
      iconColor: "#4AB3F4",
      sound: "beep.wav",
    },
  },
};

export default config;
