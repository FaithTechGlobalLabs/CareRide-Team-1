import type { Driver, House, Ride, RideOffer, RideType } from '../types'
import { matchDrivers } from './matchDrivers'

// How long a driver has to accept or decline before the offer moves on.
export const OFFER_TIMEOUT_MINUTES: Record<RideType, number> = {
  ON_DEMAND: 5,
  SCHEDULED: 60,
}

export function offerExpiry(type: RideType, from = new Date()): string {
  return new Date(from.getTime() + OFFER_TIMEOUT_MINUTES[type] * 60_000).toISOString()
}

export function isExpired(offer: RideOffer, now = new Date()): boolean {
  return offer.status === 'PENDING' && new Date(offer.expiresAt) <= now
}

// Picks the next driver to ask, skipping anyone already asked for this ride.
// Returns undefined when nobody is left, so the ride needs attention.
export function nextDriver(
  ride: Ride,
  house: House | undefined,
  drivers: Driver[],
  offers: RideOffer[],
): Driver | undefined {
  const alreadyAsked = offers.filter((o) => o.rideId === ride.id).map((o) => o.driverId)
  return matchDrivers(ride, house, drivers, alreadyAsked)[0]
}
