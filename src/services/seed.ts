import type { Destination, Driver, House, Organization, Ride, RideOffer, User } from '../types'

// The app starts empty except for a CareRide admin sign-in.
// Organization and driver counts on the admin view come from this store.

// Demo only: the mock backend keeps passwords in plain text in the browser.
// A real backend must use a proper auth provider (e.g. Supabase Auth).
export interface Credential {
  email: string
  userId: string
  password: string
}

export const DEMO_PASSWORD = 'careride'
export const DEMO_EMAIL_DOMAIN = '@careride.demo'

export interface Database {
  credentials: Credential[]
  users: User[]
  organizations: Organization[]
  houses: House[]
  drivers: Driver[]
  destinations: Destination[]
  rides: Ride[]
  offers: RideOffer[]
}

const demoUsers: User[] = [
  { id: 'u-admin', name: 'CareRide Admin', email: 'admin@careride.demo', phone: '604-555-0100', role: 'PLATFORM_ADMIN' },
]

export const seed: Database = {
  credentials: demoUsers.map((u) => ({ email: u.email!, userId: u.id, password: DEMO_PASSWORD })),
  users: demoUsers,
  organizations: [],
  houses: [],
  drivers: [],
  destinations: [],
  rides: [],
  offers: [],
}
