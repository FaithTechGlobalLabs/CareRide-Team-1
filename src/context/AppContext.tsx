import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { dataService, isDemoBackend } from '../services'
import type { User } from '../types'
import { AppContext } from './appContext'

// The demo has no server, so frequent polling is what moves timed-out requests on and syncs tabs.
// The real backend pushes changes (live updates) and runs deadlines itself; polling is only a safety net.
const POLL_MS = isDemoBackend ? 4000 : 30_000
// Several changes often arrive together (e.g. one booking sends offers to many drivers): reload once.
const LIVE_UPDATE_DEBOUNCE_MS = 300

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User>()
  const [ready, setReady] = useState(false)
  const [sessionError, setSessionError] = useState<string>()
  const [sessionVersion, setSessionVersion] = useState(0)
  const [version, setVersion] = useState(0)
  // Failed loads, keyed by the screen part that failed, so one recovering doesn't hide another's error
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({})
  // Only the latest session check may update state, e.g. a sign-in beats a slower restore.
  const sessionRequest = useRef(0)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  const setLoadError = useCallback((key: string, message: string | undefined) => {
    setLoadErrors((current) => {
      if (current[key] === message) return current
      const next = { ...current }
      if (message === undefined) delete next[key]
      else next[key] = message
      return next
    })
  }, [])
  const retrySession = useCallback(() => setSessionVersion((v) => v + 1), [])

  // Ask the backend who is signed in: on start, and whenever the session changes elsewhere.
  useEffect(() => {
    const request = ++sessionRequest.current
    dataService
      .restoreSession()
      .then(
        (user) => {
          if (request !== sessionRequest.current) return
          setCurrentUser(user)
          setSessionError(undefined)
        },
        (err: Error) => {
          if (request !== sessionRequest.current) return
          setCurrentUser(undefined)
          setSessionError(err.message)
        },
      )
      .finally(() => {
        if (request === sessionRequest.current) setReady(true)
      })
  }, [sessionVersion])

  useEffect(() => dataService.onSessionChange(retrySession), [retrySession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const request = ++sessionRequest.current
      let user: User
      try {
        user = await dataService.signIn(email, password)
      } catch (err) {
        retrySession() // this attempt cancelled any session check in flight; run it again
        throw err
      }
      if (request === sessionRequest.current) {
        setCurrentUser(user)
        setSessionError(undefined)
        setReady(true)
      }
      refresh()
      return user
    },
    [refresh, retrySession],
  )

  const signOut = useCallback(async () => {
    ++sessionRequest.current
    try {
      await dataService.signOut()
    } finally {
      // Clear this screen even if the backend call failed, so private data doesn't linger
      setCurrentUser(undefined)
      setSessionError(undefined)
      setUsers([])
      setLoadErrors({})
      setReady(true)
      refresh()
    }
  }, [refresh])

  useEffect(() => {
    let active = true
    dataService.listUsers().then(
      (list) => active && setUsers(list),
      () => active && setUsers([]), // e.g. signed out on the real backend
    )
    return () => {
      active = false
    }
  }, [version, currentUser?.id])

  // Keep two open tabs (e.g. a house and a driver) in sync during the demo
  useEffect(() => {
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [refresh])

  // Live updates while signed in: reload when rides, requests or approvals change elsewhere.
  // Subscribed per person, so signing out (or in as someone else) drops the old subscription.
  const userId = currentUser?.id
  useEffect(() => {
    if (!userId) return
    let timer: number | undefined
    const unsubscribe = dataService.onDataChange(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(refresh, LIVE_UPDATE_DEBOUNCE_MS)
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [userId, refresh])

  // A safety net for anything live updates missed, plus catching up when someone comes back to the tab.
  useEffect(() => {
    if (!userId) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, refresh])

  const loadError = Object.values(loadErrors)[0]

  const value = useMemo(
    () => ({ users, currentUser, ready, sessionError, signIn, signOut, retrySession, version, refresh, loadError, setLoadError }),
    [users, currentUser, ready, sessionError, signIn, signOut, retrySession, version, refresh, loadError, setLoadError],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
