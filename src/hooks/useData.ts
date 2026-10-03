import { useEffect, useRef, useState } from 'react'
import { useApp } from './useApp'

// Loads data from the service and reloads it after every change.
// Pass a `key` (e.g. a route param) to reload when it changes.
export function useData<T>(load: () => Promise<T>, key?: string): T | undefined {
  const { version } = useApp()
  const [data, setData] = useState<T>()
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let active = true
    loadRef.current().then((result) => {
      if (active) setData(result)
    })
    return () => {
      active = false
    }
  }, [version, key])

  return data
}
