import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d",
  appName: "BloodLyn",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    // Native-feel WebView tuning
    backgroundColor: "#f8fafc",
    webContentsDebuggingEnabled: false,
    // Route key/touch input straight to the WebView (less input latency)
    captureInput: true,
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
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
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
