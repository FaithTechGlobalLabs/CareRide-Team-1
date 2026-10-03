import type { Ride } from '../types'

// A confirmed ride counts as late this long after pickup time if the driver hasn't picked up the client.
export const DRIVER_LATE_AFTER_MINUTES = 10

// On-demand rides have no set pickup time (it's the booking time), so they're never flagged as late.
export function isDriverLate(ride: Ride, now = new Date()): boolean {
  if (ride.type === 'ON_DEMAND' || ride.status !== 'ACCEPTED') return false
  return now.getTime() > new Date(ride.pickupTime).getTime() + DRIVER_LATE_AFTER_MINUTES * 60_000
}

// A driver accepted, then said they can't make it, and nobody has taken it since.
export function wasDropped(ride: Ride): boolean {
  return !!ride.droppedBy && (ride.status === 'SEARCHING' || ride.status === 'OFFERED' || ride.status === 'NEEDS_ATTENTION')
}
