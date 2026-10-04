import { useEffect, useId, useRef, useState } from 'react'
import { useApp } from './useApp'

// Loads data from the service and reloads it after every change.
// Pass a `key` (e.g. a route param) to reload when it changes.
// If a reload fails, the last good data stays on screen and the app shows a "Try again" banner.
export function useData<T>(load: () => Promise<T>, key?: string): T | undefined {
  const { version, setLoadError } = useApp()
  const errorKey = useId()
  const [data, setData] = useState<T>()
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let active = true
    loadRef.current().then(
      (result) => {
        if (!active) return
        setData(result)
        setLoadError(errorKey, undefined)
      },
      (err: unknown) => {
        if (active) setLoadError(errorKey, err instanceof Error ? err.message : 'Something went wrong.')
      },
    )
    return () => {
      active = false
    }
  }, [version, key, errorKey, setLoadError])

  // A screen that's gone shouldn't leave its error behind
  useEffect(() => () => setLoadError(errorKey, undefined), [errorKey, setLoadError])

  return data
}
