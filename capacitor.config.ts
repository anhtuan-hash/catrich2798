import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.brianenglish.studio',
  appName: 'Brian English Studio',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
  server: {
    iosScheme: 'https',
    cleartext: false,
  },
};

export default config;
