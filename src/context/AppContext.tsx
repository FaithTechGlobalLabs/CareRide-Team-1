import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dataService } from '../services'
import type { User } from '../types'
import { AppContext } from './appContext'

const SESSION_KEY = 'careride-session-v3'

function readSession(): string {
  try {
    return localStorage.getItem(SESSION_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeSession(userId: string): void {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore: the session just won't survive a reload
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [ready, setReady] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(readSession)
  const [version, setVersion] = useState(0)
  const [signedOut, setSignedOut] = useState(false)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const signIn = useCallback(
    (user: User) => {
      writeSession(user.id)
      setCurrentUserId(user.id)
      setSignedOut(false)
      refresh()
    },
    [refresh],
  )

  const signOut = useCallback(() => {
    writeSession('')
    setCurrentUserId('')
    setSignedOut(true)
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

  const value = useMemo(
    () => ({
      users,
      currentUser: users.find((u) => u.id === currentUserId),
      ready,
      signIn,
      signOut,
      signedOut,
      version,
      refresh,
    }),
    [users, currentUserId, ready, signIn, signOut, signedOut, version, refresh],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
