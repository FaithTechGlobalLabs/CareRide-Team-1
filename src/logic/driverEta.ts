import type { Ride } from '../types'
import { formatTime } from './formatTime'

// On-demand: minutes from now until pickup. Scheduled: minutes early (negative) or late versus the booked time.
export type DriverEtaHint = { minutes: number; relativeTo: 'now' | 'pickup' }

export const TRAVEL_ETA_MINUTES = [5, 10, 15, 20, 30]
export const PICKUP_OFFSET_MINUTES = [-15, -10, -5, 0, 5, 10, 15, 20, 30]

export function pickupOffsetLabel(minutes: number): string {
  if (minutes === 0) return 'On time'
  return minutes < 0 ? `${-minutes} min early` : `${minutes} min late`
}

export function etaTimestamp(ride: Pick<Ride, 'pickupTime'>, hint: DriverEtaHint, now = Date.now()): string | undefined {
  const minutes = Math.round(hint.minutes)
  if (hint.relativeTo === 'pickup') return new Date(Date.parse(ride.pickupTime) + minutes * 60_000).toISOString()
  if (minutes > 0) return new Date(now + minutes * 60_000).toISOString()
  return undefined
}

// Lowercase, to drop into "Frank is on the way, {phrase}."
export function driverEtaPhrase(ride: Ride): string | undefined {
  if (!ride.driverEta) return undefined
  if (ride.type !== 'SCHEDULED') return `expected by ${formatTime(ride.driverEta)}`
  const offset = Math.round((Date.parse(ride.driverEta) - Date.parse(ride.pickupTime)) / 60_000)
  if (offset === 0) return `on time for ${formatTime(ride.pickupTime)}`
  if (offset > 0) return `${offset} min late (expected by ${formatTime(ride.driverEta)})`
  return `${-offset} min early (expected by ${formatTime(ride.driverEta)})`
}

export function driverEtaDetail(ride: Ride): string | undefined {
  const phrase = driverEtaPhrase(ride)
  if (!phrase) return undefined
  return phrase[0].toUpperCase() + phrase.slice(1)
}
