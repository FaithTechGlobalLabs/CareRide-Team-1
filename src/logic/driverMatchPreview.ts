import type { Driver, House, Ride } from '../types'
import { isWithinRequestHours, meetsNotice } from './requestHours'
import { matchDrivers } from './matchDrivers'

// The parts of a ride that decide who can take it.
export type RideNeeds = Pick<Ride, 'type' | 'pickupTime' | 'passengers' | 'needsWheelchair'> & { preferredDriverId?: string }

export interface MatchPreview {
  count: number
  reason?: string // best guess at why nobody fits, when count is 0
}

// How many drivers could take this ride, and if none, a plain reason why.
// A scheduled ride also counts drivers whose request hours open before pickup: they're asked then.
export function previewDriverMatch(needs: RideNeeds, house: House, drivers: Driver[], now = new Date()): MatchPreview {
  const count = matchDrivers(needs as Ride, house, drivers, [], now, needs.type === 'ON_DEMAND').length
  if (count > 0) return { count }
  return { count, reason: guessReason(needs, house, drivers, now) }
}

type Check = 'city' | 'seats' | 'wheelchair' | 'schedule' | 'notice'
const CHECKS: Check[] = ['city', 'seats', 'wheelchair', 'schedule', 'notice']

// Find the one check that filters everyone out: drop it and someone fits.
function guessReason(needs: RideNeeds, house: House, drivers: Driver[], now: Date): string {
  const pickup = new Date(needs.pickupTime)
  const active = drivers.filter((d) => d.status === 'APPROVED' && d.available)
  if (active.length === 0) return 'no drivers are taking requests right now.'

  const passes = (d: Driver, check: Check) => {
    switch (check) {
      case 'city':
        return d.serviceCities.includes(house.city)
      case 'seats':
        return d.seats >= needs.passengers
      case 'wheelchair':
        return !needs.needsWheelchair || d.wheelchairAccessible
      case 'schedule':
        return needs.type !== 'ON_DEMAND' || isWithinRequestHours(d.requestHours, now)
      case 'notice':
        return needs.type === 'ON_DEMAND' || meetsNotice(d.minNoticeHours, pickup, now)
    }
  }
  const fitsAllBut = (skip: Check) => active.filter((d) => CHECKS.every((c) => c === skip || passes(d, c)))

  for (const check of CHECKS) {
    const almost = fitsAllBut(check)
    if (almost.length === 0) continue
    switch (check) {
      case 'city':
        return `no driver serves ${house.city} right now.`
      case 'seats':
        return `no driver has room for ${needs.passengers} people. Try two smaller rides.`
      case 'wheelchair':
        return 'no wheelchair-accessible driver is free at this time.'
      case 'schedule':
        return "no driver is taking requests right now. Try again later, or book it as a scheduled ride."
      case 'notice': {
        const hours = Math.min(...almost.map((d) => d.minNoticeHours))
        const who = needs.needsWheelchair ? 'wheelchair rides need' : 'drivers need'
        return `${who} ${hours} ${hours === 1 ? "hour's" : "hours'"} notice. Try a later time.`
      }
    }
  }
  return 'try a different time, or fewer people per ride.'
}
