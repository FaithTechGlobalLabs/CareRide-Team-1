import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dataService } from '../services'
import type { User } from '../types'
import { AppContext } from './appContext'

const SESSION_KEY = 'careride-session-v3'
const POLL_MS = 4000

// The session is saved in localStorage so people stay signed in when they come back
// to the site or reopen the phone app. Each tab also keeps its own copy in
// sessionStorage, which wins on reload, so two tabs signed in as different people
// (e.g. a house and a driver) don't swap accounts. A new tab picks up whoever
// signed in last.
function readSession(): string {
  try {
    const tabSession = sessionStorage.getItem(SESSION_KEY)
    if (tabSession) return tabSession
    const saved = localStorage.getItem(SESSION_KEY) ?? ''
    if (saved) sessionStorage.setItem(SESSION_KEY, saved)
    return saved
  } catch {
    return ''
  }
}

function writeSession(userId: string): void {
  try {
    if (userId) {
      sessionStorage.setItem(SESSION_KEY, userId)
      localStorage.setItem(SESSION_KEY, userId)
    } else {
      sessionStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(SESSION_KEY)
    }
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
