import type { Driver, Facility, Ride } from '../types'

// Returns drivers who can take this ride, best match first.
// A driver is eligible if they are approved, their vehicle fits the client's
// needs, they serve the facility's city, and (for essential rides) they are available now.
export function matchDrivers(
  ride: Ride,
  facility: Facility | undefined,
  drivers: Driver[],
  excludeDriverIds: string[] = [],
): Driver[] {
  return drivers
    .filter((d) => d.status === 'APPROVED')
    .filter((d) => !excludeDriverIds.includes(d.id))
    .filter((d) => !ride.needsWheelchair || d.wheelchairAccessible)
    .filter((d) => !facility || d.serviceCities.includes(facility.city))
    .filter((d) => ride.type !== 'ESSENTIAL' || d.available)
  // TODO: rank by distance once we have locations
}
