import { createContext } from 'react'
import type { User } from '../types'

export interface AppState {
  users: User[]
  currentUser: User | undefined
  setCurrentUserId: (id: string) => void
  // Bumped after every change so screens reload their data
  version: number
  refresh: () => void
}

export const AppContext = createContext<AppState | undefined>(undefined)
