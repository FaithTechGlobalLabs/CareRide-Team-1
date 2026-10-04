import type { UserRole } from '../types'

// The main page each type of account lands on after signing in.
export const HOME_FOR: Record<UserRole, string> = {
  PLATFORM_ADMIN: '/admin',
  ORG_ADMIN: '/org',
  PARTNER: '/partner',
  DRIVER: '/driver',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  PLATFORM_ADMIN: 'CareRide admin',
  ORG_ADMIN: 'Transport provider',
  PARTNER: 'Partner organization',
  DRIVER: 'Driver',
}

// Where a ride's detail page lives for the partner organization that booked it.
export function ridePath(rideId: string): string {
  return `/partner/ride/${rideId}`
}
