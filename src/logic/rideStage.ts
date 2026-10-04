import type { RideStatus } from '../types'

export const RIDE_STEPS = ['Booked', 'Confirmed', 'Picked up', 'Arrived'] as const

// How far along the road a ride is: the index of the last step reached in RIDE_STEPS.
// Undefined when the ride stopped short (no-show, cancelled), so it is drawn grey instead.
export function rideStage(status: RideStatus): number | undefined {
  switch (status) {
    case 'SEARCHING':
    case 'OFFERED':
    case 'NEEDS_ATTENTION':
      return 0
    case 'ACCEPTED':
      return 1
    case 'PICKED_UP':
      return 2
    case 'COMPLETED':
      return 3
    default:
      return undefined
  }
}
