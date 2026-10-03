import type { Driver, House, Ride } from '../types'
import { isWithinAvailability, meetsNotice } from './availability'

// Returns drivers who can take this ride, best match first.
// Eligible: approved, taking requests, serves the house's city, has enough
// spaces, fits wheelchair needs, is scheduled at pickup time, and got enough notice.
export function matchDrivers(
  ride: Ride,
  house: House | undefined,
  drivers: Driver[],
  excludeDriverIds: string[] = [],
  now = new Date(),
): Driver[] {
  const pickup = new Date(ride.pickupTime)

  const eligible = drivers.filter(
    (d) =>
      d.status === 'APPROVED' &&
      d.available &&
      !excludeDriverIds.includes(d.id) &&
      (!house || d.serviceCities.includes(house.city)) &&
      d.seats >= ride.passengers &&
      (!ride.needsWheelchair || d.wheelchairAccessible) &&
      isWithinAvailability(d.availability, pickup) &&
      meetsNotice(d.minNoticeHours, pickup, now),
  )

  // Ask the preferred driver first (e.g. the outbound driver for a return trip).
  // Keep wheelchair-accessible and larger vehicles free for rides that need them.
  const rank = (d: Driver) =>
    (d.id === ride.preferredDriverId ? -1000 : 0) +
    (d.wheelchairAccessible && !ride.needsWheelchair ? 100 : 0) +
    d.seats

  return eligible.sort((a, b) => rank(a) - rank(b))
  // TODO: rank by distance once we have locations
}
