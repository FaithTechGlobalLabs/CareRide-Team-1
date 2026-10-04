import type { Ride } from '../types'

export const TRANSIT_TICKET_REASON = 'Sent on transit. Gave a Compass Ticket.'
export const TRANSIT_PASS_REASON = 'Sent on transit. Client already has a pass.'
export const SENT_ON_TRANSIT_LABEL = 'Sent on transit'

export function isSentOnTransit(ride: Pick<Ride, 'status' | 'cancelReason'>): boolean {
  return ride.status === 'CANCELLED' && !!ride.cancelReason?.startsWith('Sent on transit')
}

// Override the status badge when a cancelled ride is actually a transit fallback.
export function rideBadgeLabel(ride: Pick<Ride, 'status' | 'cancelReason' | 'expired'>): string | undefined {
  if (isSentOnTransit(ride)) return SENT_ON_TRANSIT_LABEL
  if (ride.expired) return 'No driver found'
  return undefined
}

// "1 passenger", "3 passengers"
export function passengersLabel(n: number): string {
  return `${n} ${n === 1 ? 'passenger' : 'passengers'}`
}

// The rider names staff gave, e.g. "Sam Rivera and Alex", or undefined if none.
export function riderLabel(ride: Pick<Ride, 'riderNames'>): string | undefined {
  const names = (ride.riderNames ?? []).map((n) => n.trim()).filter(Boolean)
  if (names.length === 0) return undefined
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// The badge on a driver's accepted ride, following the trip steps
export function driverRideStatusLabel(ride: Ride): string | undefined {
  if (ride.status === 'PICKED_UP') return 'Driving to drop-off'
  if (ride.status !== 'ACCEPTED') return undefined
  if (ride.driverArrivedAt) return 'At pickup'
  if (ride.driverOnTheWayAt) return 'On your way'
  return 'Accepted'
}
