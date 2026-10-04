/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capgo/capacitor-updater" />
import type { CapacitorConfig } from '@capacitor/cli'

const otaEnabled = process.env.CAPACITOR_OTA !== '0'
const liveOrigin = (
  process.env.CAPACITOR_OTA_ORIGIN ||
  process.env.VITE_PUBLIC_SITE_URL ||
  'https://careride-team-1.careride.workers.dev'
).replace(/\/+$/, '')

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
    CapacitorUpdater: {
      autoUpdate: otaEnabled ? 'atBackground' : 'off',
      updateUrl: `${liveOrigin}/api/ota`,
      statsUrl: '',
      channelUrl: '',
      version: '1.0.0',
    },
  },
}

export default config
