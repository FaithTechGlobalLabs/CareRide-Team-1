import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.careride.app',
  appName: 'CareRide',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      style: 'LIGHT',
      hidden: false,
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#ffffffff',
      showSpinner: false,
    },
  },
}

export default config
