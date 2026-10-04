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

// An on-demand ride nobody has accepted after this long is called off, so the partner can make other plans.
export const ON_DEMAND_GIVE_UP_MINUTES = 30

// A driver can mark a no-show only after they have arrived and waited this long.
export const NO_SHOW_WAIT_MINUTES = 10

export const NO_SHOW_NOT_HERE = 'Say you are here, and wait with the front desk, before marking a no-show.'

export const NO_SHOW_TOO_SOON = `Wait ${NO_SHOW_WAIT_MINUTES} minutes after you arrive before marking a no-show.`

// When a ride still without a driver is cancelled automatically:
// at the pickup time for a scheduled ride, or a while after booking for an on-demand one.
export function noDriverDeadline(ride: Pick<Ride, 'type' | 'pickupTime'>): Date {
  const pickup = new Date(ride.pickupTime).getTime()
  return new Date(ride.type === 'ON_DEMAND' ? pickup + ON_DEMAND_GIVE_UP_MINUTES * 60_000 : pickup)
}

// How long a driver can take back "dropped off" or "client didn't show", in case they tapped it by mistake
export const UNDO_FINISH_MINUTES = 15

export function canUndoFinish(ride: Pick<Ride, 'status' | 'completedAt' | 'cancelledAt'>, now = Date.now()): boolean {
  const at = ride.status === 'COMPLETED' ? ride.completedAt : ride.status === 'NO_SHOW' ? ride.cancelledAt : undefined
  return !!at && now - new Date(at).getTime() < UNDO_FINISH_MINUTES * 60_000
}

export function canMarkNoShow(ride: Pick<Ride, 'status' | 'driverArrivedAt'>, now = Date.now()): boolean {
  if (ride.status !== 'ACCEPTED' || !ride.driverArrivedAt) return false
  return now - new Date(ride.driverArrivedAt).getTime() >= NO_SHOW_WAIT_MINUTES * 60_000
}

// Whole minutes still to wait after arrival. Zero once a no-show is allowed.
export function noShowMinutesLeft(ride: Pick<Ride, 'driverArrivedAt'>, now = Date.now()): number {
  if (!ride.driverArrivedAt) return NO_SHOW_WAIT_MINUTES
  const left = new Date(ride.driverArrivedAt).getTime() + NO_SHOW_WAIT_MINUTES * 60_000 - now
  return Math.max(0, Math.ceil(left / 60_000))
}

// Closing a partner account cancels rides nobody has set off for. A driver already on the way,
// or already at the door, keeps the trip and finishes it.
export function partnerCloseCancelsRide(
  ride: Pick<Ride, 'status' | 'driverOnTheWayAt' | 'driverArrivedAt'>,
): boolean {
  if (ride.status === 'SEARCHING' || ride.status === 'OFFERED' || ride.status === 'NEEDS_ATTENTION') return true
  return ride.status === 'ACCEPTED' && !ride.driverOnTheWayAt && !ride.driverArrivedAt
}

type RideShape = Pick<Ride, 'type' | 'pickupTime' | 'passengers' | 'needsWheelchair' | 'destinationAddress'>

// Changing when, where, or who sends the ride out again. Names, notes, and instructions do not.
// An on-demand pickup time is not part of this: that clock only restarts when the ride is sent again.
export function editSendsRideAgain(before: RideShape, after: RideShape): boolean {
  return (
    after.type !== before.type ||
    (after.type === 'SCHEDULED' && after.pickupTime !== before.pickupTime) ||
    after.passengers !== before.passengers ||
    after.needsWheelchair !== before.needsWheelchair ||
    after.destinationAddress !== before.destinationAddress
  )
}

// On-demand rides keep their original booking time unless the edit is sent to drivers again.
export function pickupTimeAfterEdit(before: RideShape, after: RideShape, nowIso: string): string {
  if (after.type === 'ON_DEMAND') return editSendsRideAgain(before, after) ? nowIso : before.pickupTime
  return after.pickupTime
}
