import { useEffect } from 'react'
import { useApp } from '../hooks/useApp'
import { HOME_FOR } from '../logic/homeFor'
import { isNative, listenToNativeApp } from './platform'

export function NativeBridge() {
  const { currentUser, refresh } = useApp()
  const homePath = currentUser ? HOME_FOR[currentUser.role] : '/signin'

  useEffect(() => {
    if (!isNative) return
    let cancelled = false
    let stop: (() => void) | undefined

    void listenToNativeApp({ refresh, homePath }).then((unlisten) => {
      if (cancelled) unlisten()
      else stop = unlisten
    })

    return () => {
      cancelled = true
      stop?.()
    }
  }, [homePath, refresh])

  return null
}
