import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vip.yemen",
  appName: "ViP Yemen",
  webDir: "dist",
  backgroundColor: "#121685",
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
      backgroundColor: "#121685",
      showSpinner: false,
      androidSplashResourceName: "splash",
      iosSplashResourceName: "splash",
    },
  },
};

export default config;