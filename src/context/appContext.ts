import { createContext } from 'react'
import type { User } from '../types'

export interface AppState {
  users: User[]
  currentUser: User | undefined
  ready: boolean // the session check has finished, so currentUser can be trusted
  sessionError: string | undefined // signed in (or trying to be), but the account couldn't be loaded
  signIn: (email: string, password: string) => Promise<User> // throws with a message to show
  signOut: () => Promise<void>
  retrySession: () => void
  // Bumped after every change so screens reload their data
  version: number
  refresh: () => void
  // The first data load currently failing on screen, if any (shown with a "Try again" banner)
  loadError: string | undefined
  setLoadError: (key: string, message: string | undefined) => void
}

export const AppContext = createContext<AppState | undefined>(undefined)
