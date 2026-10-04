import type { Driver, House, Ride } from '../types'
import { isWithinRequestHours } from './requestHours'

// Returns drivers who can take this ride, best match first.
// Eligible: approved, serves the house's city, has enough
// spaces, fits wheelchair needs, and wants requests right now.
// Request hours are about when we notify the driver; they decide if the pickup time suits them.
export function matchDrivers(
  ride: Ride,
  house: House | undefined,
  drivers: Driver[],
  excludeDriverIds: string[] = [],
  now = new Date(),
  checkRequestHours = true, // false: also count drivers whose request hours open later
): Driver[] {
  const eligible = drivers.filter(
    (d) =>
      d.status === 'APPROVED' &&
      !excludeDriverIds.includes(d.id) &&
      (!house || d.serviceCities.includes(house.city)) &&
      d.seats >= ride.passengers &&
      (!ride.needsWheelchair || d.wheelchairAccessible) &&
      (!checkRequestHours || isWithinRequestHours(d.requestHours, now)),
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
