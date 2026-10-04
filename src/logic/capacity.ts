import type { Driver } from '../types'

// Used before any driver is approved, so booking still works in a brand-new setup.
export const DEFAULT_MAX_PASSENGERS = 4

// The most passengers one ride can carry: the biggest approved vehicle's spaces.
// Bigger groups need two rides.
export function maxPassengers(drivers: Driver[]): number {
  const seats = drivers.filter((d) => d.status === 'APPROVED').map((d) => d.seats)
  return seats.length ? Math.max(...seats) : DEFAULT_MAX_PASSENGERS
}
