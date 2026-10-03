import type { Availability } from '../types'

// Is the driver's schedule open at this time? Windows can't cross midnight.
export function isWithinAvailability(availability: Availability, when: Date): boolean {
  if (!availability.days.includes(when.getDay())) return false
  const time = when.toTimeString().slice(0, 5)
  return time >= availability.from && time <= availability.to
}

// Was the ride booked far enough ahead for this driver?
export function meetsNotice(minNoticeHours: number, when: Date, now = new Date()): boolean {
  return when.getTime() - now.getTime() >= minNoticeHours * 3_600_000
}
