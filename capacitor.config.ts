import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d",
  appName: "BloodLyn",
  webDir: "dist",
  server: {
    url: "https://f2d1988f-75ee-4eff-96a2-c3ad823bf37d.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
