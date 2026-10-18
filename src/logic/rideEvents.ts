import type { EditedField, Ride, RideEventDetail, RideEventKind, RideStatus } from '../types'

// What goes in a ride's change history, worked out by comparing the ride before and after a change.
// The mock runs this after every change; the database trigger in the ride_events migration follows the same rules.

export interface RideEventDraft {
  kind: RideEventKind
  detail?: RideEventDetail
}

const WAITING: RideStatus[] = ['SEARCHING', 'OFFERED', 'NEEDS_ATTENTION']

const same = (a: unknown, b: unknown) => (a ?? '') === (b ?? '')

// Which details a partner's edit changed. An on-demand pickup time is just "as soon as possible", so it isn't listed.
function editDetail(before: Ride, after: Ride): RideEventDetail {
  const fields: EditedField[] = []
  if (before.type !== after.type) fields.push('type')
  const timeMoved = after.type === 'SCHEDULED' && before.pickupTime !== after.pickupTime
  if (timeMoved) fields.push('pickupTime')
  if (before.passengers !== after.passengers) fields.push('passengers')
  if (!same(before.riderNames?.join('\n'), after.riderNames?.join('\n'))) fields.push('riderNames')
  if (before.needsWheelchair !== after.needsWheelchair) fields.push('needsWheelchair')
  if (before.needsAssistance !== after.needsAssistance) fields.push('needsAssistance')
  if (!same(before.pickupInstructions, after.pickupInstructions)) fields.push('pickupInstructions')
  if (!same(before.notes, after.notes)) fields.push('notes')
  if (before.destinationName !== after.destinationName || before.destinationAddress !== after.destinationAddress) {
    fields.push('destination')
  }
  return {
    fields,
    ...(timeMoved && {
      fromPickupTime: before.type === 'SCHEDULED' ? before.pickupTime : undefined,
      toPickupTime: after.pickupTime,
    }),
  }
}

// Status changes that are a single step forward (or an undo of one)
function statusEvent(before: Ride, after: Ride, edited: boolean): RideEventDraft | undefined {
  const was = before.status
  const now = after.status
  if (was === now) return undefined
  if (now === 'ACCEPTED' && WAITING.includes(was)) return { kind: 'DRIVER_ACCEPTED' }
  if (now === 'PICKED_UP' && was === 'ACCEPTED') return { kind: 'PICKED_UP' }
  if (now === 'COMPLETED') return { kind: 'COMPLETED' }
  if (now === 'NO_SHOW') return { kind: 'NO_SHOW' }
  if (now === 'CANCELLED') return { kind: 'CANCELLED', detail: { reason: after.cancelReason, expired: after.expired || undefined } }
  if (was === 'COMPLETED' && now === 'PICKED_UP') return { kind: 'STEP_UNDONE', detail: { undid: 'COMPLETED' } }
  if (was === 'NO_SHOW' && now === 'ACCEPTED') return { kind: 'STEP_UNDONE', detail: { undid: 'NO_SHOW' } }
  if (was === 'PICKED_UP' && now === 'ACCEPTED') return { kind: 'STEP_UNDONE', detail: { undid: 'PICKED_UP' } }
  // Back out to drivers. After an edit that's part of the edit, so it isn't listed again.
  if (was === 'ACCEPTED' && WAITING.includes(now) && !edited) {
    const dropped = !!after.droppedBy && after.droppedBy.at !== before.droppedBy?.at
    return { kind: dropped ? 'DRIVER_DROPPED' : 'DRIVER_REMOVED' }
  }
  return undefined
}

// Steps the driver takes while the ride stays accepted
function progressEvent(before: Ride, after: Ride): RideEventDraft | undefined {
  if (before.status !== 'ACCEPTED' || after.status !== 'ACCEPTED' || before.driverId !== after.driverId) return undefined
  if (!before.driverArrivedAt && after.driverArrivedAt) return { kind: 'ARRIVED' }
  if (!before.driverOnTheWayAt && after.driverOnTheWayAt) return { kind: 'ON_THE_WAY', detail: after.driverEta ? { eta: after.driverEta } : undefined }
  if (before.driverArrivedAt && !after.driverArrivedAt) return { kind: 'STEP_UNDONE', detail: { undid: 'ARRIVED' } }
  if (before.driverOnTheWayAt && !after.driverOnTheWayAt) return { kind: 'STEP_UNDONE', detail: { undid: 'ON_THE_WAY' } }
  return undefined
}

// The history lines for one change. `before` is undefined for a new booking.
// Asking drivers again is logged by the retry itself, since a retry that finds nobody leaves the ride unchanged.
export function rideEventsBetween(before: Ride | undefined, after: Ride): RideEventDraft[] {
  const events: RideEventDraft[] = []
  if (!before) {
    events.push({ kind: 'REQUESTED' })
    if (after.status === 'NEEDS_ATTENTION') events.push({ kind: 'NO_DRIVER_AVAILABLE' })
    return events
  }
  const edited = !!after.changedAt && after.changedAt !== before.changedAt
  if (edited) events.push({ kind: 'EDITED', detail: editDetail(before, after) })
  const step = statusEvent(before, after, edited) ?? progressEvent(before, after)
  if (step) events.push(step)
  if (after.status === 'NEEDS_ATTENTION' && before.status !== 'NEEDS_ATTENTION') events.push({ kind: 'NO_DRIVER_AVAILABLE' })
  return events
}

// Who made a change on a ride that predates the history, as far as its timestamps tell.
export type BackfillActor = 'REQUESTER' | 'DRIVER' | 'SYSTEM' | 'UNKNOWN'

export interface BackfilledEvent extends RideEventDraft {
  at: string
  actor: BackfillActor
}

// A best-effort history for a ride booked before the log existed, from the times stored on the ride.
export function backfillRideEvents(ride: Ride): BackfilledEvent[] {
  const events: BackfilledEvent[] = [{ kind: 'REQUESTED', at: ride.createdAt, actor: 'REQUESTER' }]
  if (ride.driverId) {
    if (ride.acceptedAt) events.push({ kind: 'DRIVER_ACCEPTED', at: ride.acceptedAt, actor: 'DRIVER' })
    if (ride.driverArrivedAt) events.push({ kind: 'ARRIVED', at: ride.driverArrivedAt, actor: 'DRIVER' })
    else if (ride.driverOnTheWayAt) events.push({ kind: 'ON_THE_WAY', at: ride.driverOnTheWayAt, actor: 'DRIVER' })
    if (ride.pickedUpAt) events.push({ kind: 'PICKED_UP', at: ride.pickedUpAt, actor: 'DRIVER' })
    if (ride.completedAt) events.push({ kind: 'COMPLETED', at: ride.completedAt, actor: 'DRIVER' })
  }
  if (ride.status === 'NO_SHOW' && ride.cancelledAt) events.push({ kind: 'NO_SHOW', at: ride.cancelledAt, actor: 'DRIVER' })
  if (ride.status === 'CANCELLED' && ride.cancelledAt) {
    events.push({
      kind: 'CANCELLED',
      at: ride.cancelledAt,
      actor: ride.expired ? 'SYSTEM' : 'UNKNOWN',
      detail: { reason: ride.cancelReason, expired: ride.expired || undefined, unknownActor: !ride.expired || undefined },
    })
  }
  // Stable sort: steps stored with the same time keep the order above
  return events.sort((a, b) => a.at.localeCompare(b.at))
}
