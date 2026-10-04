const MINUTE = 60_000
const HOUR = 60 * MINUTE

// Formats a time for a datetime-local input, e.g. "2026-10-03T14:30".
export function toLocalInput(ms: number): string {
  const d = new Date(ms)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// Reads that same local string back. Date.parse can treat it as UTC, which shifts the day
// in the early morning and makes "today" and "now" land on the wrong cell.
export function parseLocalInput(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return NaN
  const [, year, month, day, hour, minute] = match
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime()
}

// Rounds up to the next quarter hour, so suggested times read cleanly (4:15, not 4:07).
function roundUpToQuarter(ms: number): number {
  const quarter = 15 * MINUTE
  return Math.ceil(ms / quarter) * quarter
}

function tomorrowAt(now: number, hour: number): number {
  const d = new Date(now)
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}

export interface QuickPick {
  label: string
  value: string // datetime-local value
}

// One-tap pickup times staff ask for most. The first one is also the form's default.
export function quickPicks(now: number): QuickPick[] {
  return [
    { label: 'In 2 hours', value: toLocalInput(roundUpToQuarter(now + 2 * HOUR)) },
    { label: 'Tomorrow, 9 AM', value: toLocalInput(tomorrowAt(now, 9)) },
    { label: 'Tomorrow, 1 PM', value: toLocalInput(tomorrowAt(now, 13)) },
  ]
}

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// "Today at 4:30 PM", "Tomorrow at 9:00 AM", or "Mon, Oct 5 at 9:00 AM".
export function describePickup(ms: number, now: number): string {
  const d = new Date(ms)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const days = Math.round((startOfDay(ms) - startOfDay(now)) / (24 * HOUR))
  if (days === 0) return `Today at ${time}`
  if (days === 1) return `Tomorrow at ${time}`
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${time}`
}
