import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d",
  appName: "BloodLyn",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    backgroundColor: "#f8fafc",
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
      launchShowDuration: 0,
      launchAutoHide: true,
      launchFadeOutDuration: 150,
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
