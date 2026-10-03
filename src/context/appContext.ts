import { createContext } from 'react'
import type { User } from '../types'

export interface AppState {
  users: User[]
  currentUser: User | undefined
  ready: boolean // users have loaded, so currentUser can be trusted
  signIn: (user: User) => void
  signOut: () => void
  // Bumped after every change so screens reload their data
  version: number
  refresh: () => void
}

export const AppContext = createContext<AppState | undefined>(undefined)
