import type { UserRole } from '../types'

// The main page each type of account lands on after signing in.
export const HOME_FOR: Record<UserRole, string> = {
  PLATFORM_ADMIN: '/admin',
  ORG_ADMIN: '/org',
  HOUSE: '/house',
  DRIVER: '/driver',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  PLATFORM_ADMIN: 'CareRide admin',
  ORG_ADMIN: 'Organization admin',
  HOUSE: 'House account',
  DRIVER: 'Driver',
}
