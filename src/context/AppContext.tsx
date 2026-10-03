import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dataService } from '../services'
import type { User } from '../types'
import { AppContext } from './appContext'

const CURRENT_USER_KEY = 'careride-current-user'

function readSavedUserId(): string {
  try {
    return localStorage.getItem(CURRENT_USER_KEY) ?? 'u-staff-van'
  } catch {
    return 'u-staff-van'
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserIdState] = useState(readSavedUserId)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const setCurrentUserId = useCallback((id: string) => {
    setCurrentUserIdState(id)
    try {
      localStorage.setItem(CURRENT_USER_KEY, id)
    } catch {
      // Ignore: the choice just won't be remembered
    }
  }, [])

  useEffect(() => {
    dataService.listUsers().then(setUsers)
  }, [version])

  // Keep two open tabs (e.g. staff + driver) in sync during the demo
  useEffect(() => {
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [refresh])

  const value = useMemo(
    () => ({
      users,
      currentUser: users.find((u) => u.id === currentUserId),
      setCurrentUserId,
      version,
      refresh,
    }),
    [users, currentUserId, setCurrentUserId, version, refresh],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
