import { ON_DEMO_DECK } from '../context/demoFrame'
import type { DataService } from './dataService'
import { mockService } from './mockService'
import { supabaseService } from './supabaseService'

// The one place to switch backends. Set VITE_DATA_BACKEND in .env.local.
// The /demo deck always uses the mock (see ON_DEMO_DECK), whatever the build says.
const backend = ON_DEMO_DECK ? 'mock' : (import.meta.env.VITE_DATA_BACKEND ?? 'mock')

// Demo-only features (sample accounts, reset button) show only on the local mock.
export const isDemoBackend = backend === 'mock'

function selectService(): DataService {
  switch (backend) {
    case 'mock':
      return mockService
    case 'supabase':
      // Never fall back to the mock silently: that would create a separate local database.
      return supabaseService
    default:
      throw new Error(`Unknown VITE_DATA_BACKEND "${backend}". Use "mock" or "supabase".`)
  }
}

export const dataService: DataService = selectService()
