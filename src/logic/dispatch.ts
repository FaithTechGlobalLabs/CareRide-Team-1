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

// Drivers who lost the race to accept never said no, so they can be asked again (e.g. after a drop)
function alreadyAsked(ride: Ride, offers: RideOffer[]): string[] {
  return offers.filter((o) => o.rideId === ride.id && o.status !== 'TAKEN').map((o) => o.driverId)
}

// A scheduled ride nobody can be asked about right now can wait for a driver whose request hours open
// before pickup. We'll ask them then.
export function canWaitForDrivers(ride: Ride, house: House | undefined, drivers: Driver[], offers: RideOffer[]): boolean {
  if (ride.type !== 'SCHEDULED' || new Date(ride.pickupTime) <= new Date()) return false
  return matchDrivers(ride, house, drivers, alreadyAsked(ride, offers), new Date(), false).length > 0
}

// Picks who to ask next, skipping anyone already asked for this ride or busy with a client.
// Everyone who can take it right now is asked at once, and the first to accept gets it.
// A preferred driver (e.g. the outbound driver for a return trip) is asked alone first.
// Returns an empty list when nobody can be asked right now.
export function driversToAsk(
  ride: Ride,
  house: House | undefined,
  drivers: Driver[],
  offers: RideOffer[],
  busyDriverIds: string[] = [],
): Driver[] {
  const matches = matchDrivers(ride, house, drivers, [...alreadyAsked(ride, offers), ...busyDriverIds])
  const preferred = matches.find((d) => d.id === ride.preferredDriverId)
  return preferred ? [preferred] : matches
}
