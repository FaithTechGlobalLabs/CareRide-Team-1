import type { EditedField, RideEvent, UndoneStep } from '../types'
import { formatDayTime } from './formatTime'

// Plain sentences for a ride's change history, e.g. "Belkin House moved the pickup from Sat, Oct 3, 9:00 AM to 9:30 AM".

const FIELD_LABELS: Record<EditedField, string> = {
  type: 'ride type',
  pickupTime: 'pickup time',
  passengers: 'number of passengers',
  riderNames: 'rider names',
  needsWheelchair: 'wheelchair needs',
  needsAssistance: 'help needed',
  pickupInstructions: 'pickup instructions',
  notes: 'notes',
  destination: 'destination',
}

const UNDONE_LABELS: Record<UndoneStep, string> = {
  ON_THE_WAY: 'setting off for the pickup',
  ARRIVED: 'arriving at the pickup',
  PICKED_UP: 'the pickup',
  COMPLETED: 'the drop-off',
  NO_SHOW: 'the no-show',
}

// "a", "a and b", "a, b and c"
function list(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// No role means CareRide made the change on its own.
export function actorLabel(event: Pick<RideEvent, 'actorRole' | 'actorName'>): string {
  if (!event.actorRole) return 'CareRide'
  if (event.actorRole === 'PLATFORM_ADMIN') return 'A CareRide admin'
  return event.actorName?.trim() || (event.actorRole === 'DRIVER' ? 'The driver' : 'The front desk')
}

function editText(actor: string, event: RideEvent): string {
  const { fields = [], fromPickupTime, toPickupTime } = event.detail ?? {}
  const parts: string[] = []
  if (fields.includes('pickupTime') && toPickupTime) {
    parts.push(
      fromPickupTime
        ? `moved the pickup from ${formatDayTime(fromPickupTime)} to ${formatDayTime(toPickupTime)}`
        : `moved the pickup to ${formatDayTime(toPickupTime)}`,
    )
  }
  const others = fields.filter((f) => f !== 'pickupTime' || !toPickupTime).map((f) => FIELD_LABELS[f])
  if (others.length) parts.push(`changed the ${list(others)}`)
  return `${actor} ${parts.length ? parts.join(' and ') : 'updated the ride'}.`
}

export function rideEventText(event: RideEvent): string {
  const actor = actorLabel(event)
  const detail = event.detail ?? {}
  switch (event.kind) {
    case 'REQUESTED':
      return `${actor} booked the ride.`
    case 'EDITED':
      return editText(actor, event)
    case 'SENT_AGAIN':
      return `${actor} asked drivers again.`
    case 'NO_DRIVER_AVAILABLE':
      return 'No driver could take it.'
    case 'DRIVER_ACCEPTED':
      return `${actor} accepted the ride.`
    case 'DRIVER_DROPPED':
      return `${actor} said they can't make it. The ride went back out to other drivers.`
    case 'DRIVER_REMOVED':
      return "The driver's account was closed, so the ride went back out to other drivers."
    case 'ON_THE_WAY':
      return detail.eta ? `${actor} set off for the pickup, expecting to arrive around ${formatDayTime(detail.eta)}.` : `${actor} set off for the pickup.`
    case 'ARRIVED':
      return `${actor} arrived at the pickup.`
    case 'PICKED_UP':
      return `${actor} picked up the client.`
    case 'COMPLETED':
      return `${actor} dropped off the client.`
    case 'NO_SHOW':
      return `${actor} marked that the client didn't show up.`
    case 'CANCELLED': {
      const reason = detail.reason ? ` ${detail.reason}` : ''
      if (detail.unknownActor) return `The ride was cancelled.${reason}`
      return `${actor} cancelled the ride.${reason}`
    }
    case 'STEP_UNDONE':
      return `${actor} took back ${detail.undid ? UNDONE_LABELS[detail.undid] : 'their last step'}.`
  }
}
