import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d",
  appName: "BloodLyn",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    backgroundColor: "#f8fafc",
    webContentsDebuggingEnabled: false,
    captureInput: true,
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
      launchShowDuration: 1000,
      launchAutoHide: false,
      launchFadeOutDuration: 300,
      backgroundColor: "#f8fafc",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: false,
    },
  },
};

export default config;
