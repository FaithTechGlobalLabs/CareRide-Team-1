import type { Ride } from '../types'

const GROUP_WINDOW_MINUTES = 30

// Finds other open rides from the same facility to the same place at about the same time.
export function findGroupableRides(ride: Ride, rides: Ride[]): Ride[] {
  const time = new Date(ride.pickupTime).getTime()
  return rides.filter(
    (r) =>
      r.id !== ride.id &&
      r.facilityId === ride.facilityId &&
      r.destinationAddress === ride.destinationAddress &&
      (r.status === 'SEARCHING' || r.status === 'OFFERED') &&
      Math.abs(new Date(r.pickupTime).getTime() - time) <= GROUP_WINDOW_MINUTES * 60_000,
  )
  // TODO: also check the driver's seat count and wheelchair needs
}
