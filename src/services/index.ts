import type { DataService } from './dataService'
import { mockService } from './mockService'

// The one place to switch backends.
export const dataService: DataService = mockService
