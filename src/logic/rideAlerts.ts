import type { Ride } from '../types'

// A driver accepted, then said they can't make it, and nobody has taken it since.
export function wasDropped(ride: Ride): boolean {
  return !!ride.droppedBy && (ride.status === 'SEARCHING' || ride.status === 'OFFERED' || ride.status === 'NEEDS_ATTENTION')
}
