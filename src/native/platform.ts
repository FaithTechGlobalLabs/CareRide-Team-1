import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

const memoryStore = (): Storage => {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

function pickStore(): Storage {
  try {
    return isNative ? localStorage : sessionStorage
  } catch {
    return memoryStore()
  }
}

// Phone: stay signed in across restarts. Browser: still sign out when the tab closes.
export const sessionStore = pickStore()

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

  const back = await App.addListener('backButton', ({ canGoBack }) => {
    if (closeOverlay()) return
    const path = window.location.pathname
    if (canGoBack && path !== options.homePath && path !== '/signin' && path !== '/') {
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
