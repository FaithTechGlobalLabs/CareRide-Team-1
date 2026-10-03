import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dataService } from '../services'
import type { User } from '../types'
import { AppContext } from './appContext'

const SESSION_KEY = 'careride-session-v3'
const POLL_MS = 4000

// The session lives in sessionStorage, so it survives a reload but not closing the
// tab or browser: every fresh visit starts signed out on the home page.
function readSession(): string {
  try {
    // Drop sessions saved by older builds, which kept people signed in forever
    localStorage.removeItem(SESSION_KEY)
    return sessionStorage.getItem(SESSION_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeSession(userId: string): void {
  try {
    if (userId) sessionStorage.setItem(SESSION_KEY, userId)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore: the session just won't survive a reload
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [ready, setReady] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(readSession)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const signIn = useCallback(
    (user: User) => {
      writeSession(user.id)
      setCurrentUserId(user.id)
      refresh()
    },
    [refresh],
  )

  const signOut = useCallback(() => {
    writeSession('')
    setCurrentUserId('')
  }, [])

  useEffect(() => {
    dataService.listUsers().then((list) => {
      setUsers(list)
      setReady(true)
    })
  }, [version])

  // Keep two open tabs (e.g. a house and a driver) in sync during the demo
  useEffect(() => {
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [refresh])

  // Check for new ride requests and answers every few seconds while signed in.
  // This also moves timed-out requests on to other drivers.
  // TODO: a real backend should push changes instead
  useEffect(() => {
    if (!currentUserId) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [currentUserId, refresh])

  const value = useMemo(
    () => ({
      users,
      currentUser: users.find((u) => u.id === currentUserId),
      ready,
      signIn,
      signOut,
      version,
      refresh,
    }),
    [users, currentUserId, ready, signIn, signOut, version, refresh],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
