import type { Ride } from '../types'

// What the house or org hears once a driver accepts, e.g. "Frank accepted your request and is on their way."
// Scheduled rides more than an hour away give the pickup time instead.
export function acceptedMessage(ride: Ride, driverName = 'A driver'): string {
  if (ride.status === 'PICKED_UP') return `${driverName} has picked up the client.`
  const soon = new Date(ride.pickupTime).getTime() - Date.now() < 60 * 60_000
  if (ride.type === 'ON_DEMAND' || soon) return `${driverName} accepted your request and is on their way.`
  const when = new Date(ride.pickupTime).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${driverName} accepted your request and will pick up ${when}.`
}
