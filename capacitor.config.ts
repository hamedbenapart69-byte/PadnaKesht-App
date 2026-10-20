import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.padnakasht.kimi',
  appName: 'پادناکِشت',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: true
    }
  }
};

export default config;
