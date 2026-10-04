import { WEEKDAYS } from '../constants'
import type { RequestHours, TimeWindow } from '../types'

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const ALL_DAY: TimeWindow = { from: '00:00', to: '23:59' }

// A schedule with the same window on the given days (0 = Sunday) and nothing on the rest.
export function hoursOn(days: number[], window: TimeWindow): RequestHours {
  return WEEKDAYS.map((_, i) => (days.includes(i) ? { ...window } : null))
}

// One-tap starting points for the schedule editor.
export const REQUEST_PRESETS: { id: string; label: string; detail: string; hours: RequestHours }[] = [
  { id: 'weekdays', label: 'Weekday daytime', detail: 'Mon–Fri, 9 AM–5 PM', hours: hoursOn([1, 2, 3, 4, 5], { from: '09:00', to: '17:00' }) },
  { id: 'evenings', label: 'Evenings', detail: 'Every day, 5–10 PM', hours: hoursOn([0, 1, 2, 3, 4, 5, 6], { from: '17:00', to: '22:00' }) },
  { id: 'weekends', label: 'Weekends', detail: 'Sat–Sun, 9 AM–6 PM', hours: hoursOn([0, 6], { from: '09:00', to: '18:00' }) },
  { id: 'anytime', label: 'Any time', detail: 'Every day, all day', hours: hoursOn([0, 1, 2, 3, 4, 5, 6], ALL_DAY) },
]

export const DEFAULT_REQUEST_HOURS = REQUEST_PRESETS[0].hours

export function sameHours(a: RequestHours, b: RequestHours): boolean {
  return a.every((w, i) => (w && b[i] ? w.from === b[i].from && w.to === b[i].to : w === b[i]))
}

export function hasAnyHours(hours: RequestHours): boolean {
  return hours.some(Boolean)
}

// Index of a day whose window ends before it starts, if any.
export function invalidDay(hours: RequestHours): number {
  return hours.findIndex((w) => w !== null && w.from >= w.to)
}

export function requestHoursError(hours: RequestHours): string | undefined {
  if (!hasAnyHours(hours)) return 'Turn on at least one day.'
  const day = invalidDay(hours)
  return day >= 0 ? `On ${DAY_NAMES[day]}, the end time must be after the start time.` : undefined
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// "09:00" -> "9 AM", "17:30" -> "5:30 PM", "23:59" -> "midnight"
export function formatTime(time: string): string {
  if (time === ALL_DAY.to) return 'midnight'
  const [h, m] = time.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

export function formatWindow(w: TimeWindow): string {
  if (w.from === ALL_DAY.from && w.to === ALL_DAY.to) return 'all day'
  return `${formatTime(w.from)}–${formatTime(w.to)}`
}

// Window length as a share of the day, for drawing it on a 24-hour bar.
export function windowSpan(w: TimeWindow): { start: number; width: number } {
  const start = toMinutes(w.from) / 1440
  return { start, width: Math.max(0, toMinutes(w.to) / 1440 - start) }
}

// Rough weekly total, e.g. "40 hours a week".
export function weeklyHours(hours: RequestHours): number {
  return Math.round(hours.reduce((sum, w) => sum + (w ? Math.max(0, toMinutes(w.to) - toMinutes(w.from)) : 0), 0) / 60)
}

// Short summary, grouping days in a row that share a window: "Mon–Fri 9 AM–5 PM · Sat all day".
export function describeRequestHours(hours: RequestHours): string {
  const parts: string[] = []
  // Start from Monday so weekends read naturally at the end
  const order = [1, 2, 3, 4, 5, 6, 0]
  let i = 0
  while (i < order.length) {
    const w = hours[order[i]]
    if (!w) {
      i++
      continue
    }
    let j = i
    while (j + 1 < order.length && hours[order[j + 1]]?.from === w.from && hours[order[j + 1]]?.to === w.to) j++
    const days = i === j ? WEEKDAYS[order[i]] : `${WEEKDAYS[order[i]]}–${WEEKDAYS[order[j]]}`
    parts.push(`${days} ${formatWindow(w)}`)
    i = j + 1
  }
  if (parts.length === 1 && parts[0].startsWith('Mon–Sun')) return `Every day, ${parts[0].slice(8)}`
  return parts.join(' · ') || 'No times set'
}

// Is this a time the driver wants to hear about requests?
export function isWithinRequestHours(hours: RequestHours, when: Date): boolean {
  const w = hours[when.getDay()]
  if (!w) return false
  const time = when.toTimeString().slice(0, 5)
  return time >= w.from && time <= w.to
}

// When their request hours next open, looking a week ahead.
export function nextRequestStart(hours: RequestHours, now = new Date()): Date | undefined {
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(now)
    day.setDate(now.getDate() + offset)
    const w = hours[day.getDay()]
    if (!w) continue
    const [h, m] = w.from.split(':').map(Number)
    day.setHours(h, m, 0, 0)
    if (day > now) return day
  }
  return undefined
}

