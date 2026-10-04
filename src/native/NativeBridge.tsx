import { useEffect } from 'react'
import { useApp } from '../hooks/useApp'
import { HOME_FOR } from '../logic/homeFor'
import { hideSplash, isNative, listenToKeyboard, listenToNativeApp } from './platform'

export function NativeBridge() {
  const { currentUser, ready, refresh } = useApp()
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

  useEffect(() => {
    if (!isNative) return
    let cancelled = false
    let stop: (() => void) | undefined
    void listenToKeyboard().then((unlisten) => {
      if (cancelled) unlisten()
      else stop = unlisten
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [])

  useEffect(() => {
    if (!isNative || !ready) return
    void hideSplash()
  }, [ready])

  return null
}
