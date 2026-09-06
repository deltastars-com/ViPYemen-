import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vip.yemen",
  appName: "ViP Yemen",
  webDir: "dist",
  backgroundColor: "#0a0e1a",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0a0e1a",
      showSpinner: false,
      androidSplashResourceName: "splash",
      iosSplashResourceName: "splash",
    },
  },
};

export default config;