import type { Ride } from '../types'
import { driverEtaPhrase } from './driverEta'

// Where the driver is, in one line for the partner, e.g. "Frank is on the way, 10 min late (expected by 2:15 PM)."
// Before the driver sets off, scheduled rides more than an hour away give the pickup time instead.
export function acceptedMessage(ride: Ride, driverName = 'A driver'): string {
  if (ride.status === 'PICKED_UP') return `${driverName} has picked up the client.`
  if (ride.driverArrivedAt) return `${driverName} is at the pickup.`
  if (ride.driverOnTheWayAt) {
    const eta = driverEtaPhrase(ride)
    return `${driverName} is on the way${eta ? `, ${eta}` : ''}.`
  }
  const soon = new Date(ride.pickupTime).getTime() - Date.now() < 60 * 60_000
  if (ride.type === 'ON_DEMAND' || soon) return `${driverName} accepted your request and will head over soon.`
  const when = new Date(ride.pickupTime).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${driverName} accepted your request and will pick up ${when}.`
}
