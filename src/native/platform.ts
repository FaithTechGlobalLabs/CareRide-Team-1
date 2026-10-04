import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

function closeOverlay(): boolean {
  const dialog = document.querySelector('dialog[open]')
  if (dialog instanceof HTMLDialogElement) {
    dialog.close()
    return true
  }

  const combobox = document.querySelector<HTMLElement>('[role="combobox"][aria-expanded="true"]')
  if (combobox) {
    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    return true
  }

  if (
    document.querySelector('[role="menu"]') ||
    document.querySelector('[aria-controls="landing-menu"][aria-expanded="true"]')
  ) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    return true
  }

  return false
}

export async function listenToNativeApp(options: {
  refresh: () => void
  homePath: string
}): Promise<() => void> {
  if (!isNative) return () => {}

  const { App } = await import('@capacitor/app')

  const resume = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) options.refresh()
  })

  // Capacitor's canGoBack is the WebView back stack, which is often empty for this SPA.
  // Use the route instead: nested screens go back, home / sign-in minimize.
  const back = await App.addListener('backButton', () => {
    if (closeOverlay()) return
    const path = window.location.pathname
    if (path !== options.homePath && path !== '/signin' && path !== '/') {
      window.history.back()
      return
    }
    void App.minimizeApp()
  })

  return () => {
    void resume.remove()
    void back.remove()
  }
}

export async function hideSplash(): Promise<void> {
  if (!isNative) return
  const { SplashScreen } = await import('@capacitor/splash-screen')
  await SplashScreen.hide()
}

export async function notifyOtaReady(): Promise<void> {
  if (!isNative) return
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
    await CapacitorUpdater.notifyAppReady()
  } catch (error) {
    console.error('OTA ready check failed', error)
  }
  const { loadLiveBundle } = await import('./buildStamp')
  await loadLiveBundle()
}

export async function listenToKeyboard(): Promise<() => void> {
  if (!isNative) return () => {}
  const { Keyboard } = await import('@capacitor/keyboard')
  const show = await Keyboard.addListener('keyboardWillShow', () => {
    document.documentElement.classList.add('native-keyboard-open')
  })
  const hide = await Keyboard.addListener('keyboardDidShow', () => {
    document.documentElement.classList.add('native-keyboard-open')
  })
  const gone = await Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.classList.remove('native-keyboard-open')
  })
  const goneDid = await Keyboard.addListener('keyboardDidHide', () => {
    document.documentElement.classList.remove('native-keyboard-open')
  })
  return () => {
    document.documentElement.classList.remove('native-keyboard-open')
    void show.remove()
    void hide.remove()
    void gone.remove()
    void goneDid.remove()
  }
}

export async function openExternal(url: string): Promise<void> {
  if (!isNative) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  const { AppLauncher } = await import('@capacitor/app-launcher')
  try {
    await AppLauncher.openUrl({ url })
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    if (!isNative) throw new Error('Copy is not available.')
    const { Clipboard } = await import('@capacitor/clipboard')
    await Clipboard.write({ string: text })
  }
}

interface CarePrintPlugin {
  print(): Promise<void>
}

export async function printPage(): Promise<void> {
  if (!isNative) {
    window.print()
    return
  }
  const { registerPlugin } = await import('@capacitor/core')
  const CarePrint = registerPlugin<CarePrintPlugin>('CarePrint')
  await CarePrint.print()
}
