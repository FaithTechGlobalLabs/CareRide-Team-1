// Plain, unambiguous dates for staff, drivers, and the printed slip.
// e.g. "Sat, Oct 3, 11:18 AM". No seconds, no numeric dates like 10/3/2026.

const DAY_TIME: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }

export function formatDayTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, DAY_TIME)
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, TIME)
}
