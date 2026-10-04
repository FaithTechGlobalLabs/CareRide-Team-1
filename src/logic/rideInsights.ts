import type { Ride } from '../types'
import { isDriverLate, wasDropped } from './rideAlerts'

const DAY = 24 * 60 * 60_000

export const FINISHED: Ride['status'][] = ['COMPLETED', 'NO_SHOW', 'CANCELLED']

export const isFinished = (r: Ride) => FINISHED.includes(r.status)

// A ride staff should look at now: nobody took it, its driver dropped it, or its driver is late.
export const needsAction = (r: Ride, now?: Date) => r.status === 'NEEDS_ATTENTION' || wasDropped(r) || isDriverLate(r, now)

// One line on why a ride needs a look, or undefined if it doesn't.
export function actionReason(r: Ride, now?: Date): string | undefined {
  if (isDriverLate(r, now)) return "The driver hasn't arrived yet"
  if (wasDropped(r)) return "The driver can't make it. We're asking others"
  if (r.status === 'NEEDS_ATTENTION') return 'No driver has accepted yet'
  return undefined
}

export const finishedAt = (r: Ride) => r.completedAt ?? r.cancelledAt ?? r.pickupTime

export const byPickup = (a: Ride, b: Ride) => a.pickupTime.localeCompare(b.pickupTime)

export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Weeks start on Sunday, matching the request-hours editor.
export function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms))
  d.setDate(d.getDate() - d.getDay())
  return d.getTime()
}

// "Today", "Tomorrow", or "Mon, Oct 5".
export function dayLabel(ms: number, now: number): string {
  const days = Math.round((startOfDay(ms) - startOfDay(now)) / DAY)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export interface PartnerStats {
  today: number // rides picking up today, not cancelled
  upcoming: number // not finished, picking up from now on
  completed: number
  faresSaved: number // dollars, from completed rides
}

export function partnerStats(rides: Ride[], now: number): PartnerStats {
  const todayStart = startOfDay(now)
  const pickup = (r: Ride) => new Date(r.pickupTime).getTime()
  const completed = rides.filter((r) => r.status === 'COMPLETED')
  return {
    today: rides.filter((r) => r.status !== 'CANCELLED' && pickup(r) >= todayStart && pickup(r) < todayStart + DAY).length,
    upcoming: rides.filter((r) => !isFinished(r)).length,
    completed: completed.length,
    faresSaved: completed.reduce((sum, r) => sum + r.estimatedFareSaved, 0),
  }
}

export interface DayCount {
  start: number // ms, start of the day
  count: number
}

// Rides per day by pickup time, from `before` days ago to `after` days ahead, oldest first. Cancelled rides don't count.
export function ridesPerDay(rides: Ride[], now: number, before: number, after: number): DayCount[] {
  const today = new Date(startOfDay(now))
  const days: DayCount[] = []
  for (let i = -before; i <= after; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i) // by calendar date, so daylight saving can't shift a day
    days.push({ start: d.getTime(), count: 0 })
  }
  for (const r of rides) {
    if (r.status === 'CANCELLED') continue
    const day = days.find((d) => d.start === startOfDay(new Date(r.pickupTime).getTime()))
    if (day) day.count++
  }
  return days
}

export interface PlaceCount {
  name: string
  address: string
  count: number
  lastRideId: string // the most recent ride there, to book again from
}

// Where clients go most, by finished or booked rides (not cancelled). Ties go to the most recent.
export function topDestinations(rides: Ride[], limit: number): PlaceCount[] {
  const places = new Map<string, PlaceCount & { last: string }>()
  for (const r of rides) {
    if (r.status === 'CANCELLED' || r.returnOfRideId) continue // a return trip goes back home, not somewhere new
    const key = r.destinationId ?? r.destinationAddress
    const place = places.get(key)
    if (!place) {
      places.set(key, { name: r.destinationName, address: r.destinationAddress, count: 1, lastRideId: r.id, last: r.pickupTime })
    } else {
      place.count++
      if (r.pickupTime > place.last) Object.assign(place, { last: r.pickupTime, lastRideId: r.id })
    }
  }
  return [...places.values()]
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map(({ name, address, count, lastRideId }) => ({ name, address, count, lastRideId }))
}

// "in 45 min", "in 2 h 10 min", "in 3 days", or "now" once it's due.
export function countdown(toMs: number, now: number): string {
  const minutes = Math.round((toMs - now) / 60_000)
  if (minutes <= 0) return 'now'
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `in ${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
  const days = Math.round((startOfDay(toMs) - startOfDay(now)) / DAY)
  return days === 1 ? 'tomorrow' : `in ${days} days`
}

export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
