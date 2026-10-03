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

// Picks who to ask next, skipping anyone already asked for this ride or busy with a client.
// Everyone who can take it right now is asked at once, and the first to accept gets it.
// A preferred driver (e.g. the outbound driver for a return trip) is asked alone first.
// Returns an empty list when nobody is left, so the ride needs attention.
export function driversToAsk(
  ride: Ride,
  house: House | undefined,
  drivers: Driver[],
  offers: RideOffer[],
  busyDriverIds: string[] = [],
): Driver[] {
  const alreadyAsked = offers.filter((o) => o.rideId === ride.id).map((o) => o.driverId)
  const matches = matchDrivers(ride, house, drivers, [...alreadyAsked, ...busyDriverIds])
  const preferred = matches.find((d) => d.id === ride.preferredDriverId)
  return preferred ? [preferred] : matches
}
