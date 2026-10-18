import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FEEDBACK_NOT_YET, ISSUE_REQUIRED, RATING_REQUIRED } from '../src/logic/feedback'
import { formatDayTime } from '../src/logic/formatTime'
import { backfillRideEvents, rideEventsBetween } from '../src/logic/rideEvents'
import { rideEventText } from '../src/logic/rideEventText'
import type { DataService } from '../src/services/dataService'
import type { Ride, RideEvent } from '../src/types'

function memoryStorage() {
  const mem = new Map<string, string>()
  return {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value)
    },
    removeItem: (key: string) => {
      mem.delete(key)
    },
  }
}

Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: memoryStorage(), configurable: true })

const { mockService } = (await import('../src/services/mockService')) as { mockService: DataService }

const PASSWORD = 'careride'
const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

function ride(extra: Partial<Ride> = {}): Ride {
  return {
    id: 'ride-1',
    type: 'SCHEDULED',
    orgId: 'org-belkin',
    houseId: 'house-belkin',
    requestedBy: 'u-belkin',
    passengers: 1,
    pickupAddress: '555 Homer St, Vancouver',
    destinationName: "St. Paul's Hospital",
    destinationAddress: '1081 Burrard St, Vancouver',
    pickupTime: '2026-10-20T16:00:00.000Z',
    needsWheelchair: false,
    needsAssistance: false,
    status: 'OFFERED',
    estimatedFareSaved: 2.58,
    createdAt: '2026-10-18T16:00:00.000Z',
    ...extra,
  }
}

function booking(extra: Partial<Parameters<DataService['requestRide']>[0]> = {}): Parameters<DataService['requestRide']>[0] {
  return {
    type: 'SCHEDULED',
    orgId: 'org-belkin',
    houseId: 'house-belkin',
    requestedBy: 'u-belkin',
    passengers: 1,
    pickupAddress: '555 Homer St, Vancouver',
    destinationName: "St. Paul's Hospital",
    destinationAddress: '1081 Burrard St, Vancouver',
    pickupTime: inHours(2),
    needsWheelchair: false,
    needsAssistance: false,
    estimatedFareSaved: 2.58,
    ...extra,
  }
}

const kinds = (events: RideEvent[]) => events.map((e) => e.kind)

async function acceptAs(email: string, driverId: string, rideId: string) {
  await mockService.signIn(email, PASSWORD)
  const offer = (await mockService.listMyOffers(driverId)).find((o) => o.rideId === rideId)
  assert.ok(offer, `${driverId} was asked`)
  await mockService.respondToOffer(offer.id, true)
}

test('comparing a ride before and after names the one step that happened', () => {
  const offered = ride()
  const accepted = ride({ status: 'ACCEPTED', driverId: 'd-frank', acceptedAt: '2026-10-18T16:05:00.000Z' })
  assert.deepEqual(rideEventsBetween(undefined, offered), [{ kind: 'REQUESTED' }])
  assert.deepEqual(rideEventsBetween(undefined, ride({ status: 'NEEDS_ATTENTION' })), [{ kind: 'REQUESTED' }, { kind: 'NO_DRIVER_AVAILABLE' }])
  assert.deepEqual(kinds(rideEventsBetween(offered, accepted) as RideEvent[]), ['DRIVER_ACCEPTED'])
  assert.deepEqual(rideEventsBetween(accepted, accepted), [], 'nothing changed, nothing logged')

  // Arriving also fills in "on the way", but it's one step
  const arrived = { ...accepted, driverOnTheWayAt: '2026-10-18T16:10:00.000Z', driverArrivedAt: '2026-10-18T16:10:00.000Z' }
  assert.deepEqual(rideEventsBetween(accepted, arrived), [{ kind: 'ARRIVED' }])
  assert.deepEqual(rideEventsBetween(arrived, accepted), [{ kind: 'STEP_UNDONE', detail: { undid: 'ARRIVED' } }])

  // A driver giving it up, versus their account closing
  const dropped = ride({ status: 'NEEDS_ATTENTION', droppedBy: { driverId: 'd-frank', at: '2026-10-18T16:20:00.000Z' } })
  assert.deepEqual(kinds(rideEventsBetween(accepted, dropped) as RideEvent[]), ['DRIVER_DROPPED', 'NO_DRIVER_AVAILABLE'])
  assert.deepEqual(kinds(rideEventsBetween(accepted, ride({ status: 'OFFERED' })) as RideEvent[]), ['DRIVER_REMOVED'])

  // An edit that sends an accepted ride out again is one line, not an edit plus "driver removed"
  const moved = ride({ status: 'OFFERED', pickupTime: '2026-10-20T17:00:00.000Z', notes: 'Walker', changedAt: '2026-10-18T16:30:00.000Z' })
  assert.deepEqual(rideEventsBetween(accepted, moved), [
    {
      kind: 'EDITED',
      detail: { fields: ['pickupTime', 'notes'], fromPickupTime: '2026-10-20T16:00:00.000Z', toPickupTime: '2026-10-20T17:00:00.000Z' },
    },
  ])

  // An on-demand pickup time moves to "now" when the ride is sent again; that isn't a change anyone made
  const onDemand = ride({ type: 'ON_DEMAND' })
  const resent = ride({ type: 'ON_DEMAND', pickupTime: '2026-10-18T16:40:00.000Z', passengers: 2, changedAt: '2026-10-18T16:40:00.000Z' })
  assert.deepEqual(rideEventsBetween(onDemand, resent), [{ kind: 'EDITED', detail: { fields: ['passengers'] } }])
})

test('rides from before the history get one from their stored times', () => {
  const done = ride({
    status: 'COMPLETED',
    driverId: 'd-olive',
    acceptedAt: '2026-10-18T16:05:00.000Z',
    pickedUpAt: '2026-10-20T16:01:00.000Z',
    completedAt: '2026-10-20T16:20:00.000Z',
  })
  assert.deepEqual(
    backfillRideEvents(done).map((e) => `${e.kind}:${e.actor}`),
    ['REQUESTED:REQUESTER', 'DRIVER_ACCEPTED:DRIVER', 'PICKED_UP:DRIVER', 'COMPLETED:DRIVER'],
  )
  const expired = backfillRideEvents(ride({ status: 'CANCELLED', cancelledAt: '2026-10-20T16:00:00.000Z', expired: true }))
  assert.equal(expired[1].actor, 'SYSTEM')
  const cancelled = backfillRideEvents(ride({ status: 'CANCELLED', cancelledAt: '2026-10-19T10:00:00.000Z', cancelReason: 'Moved.' }))
  assert.equal(rideEventText({ id: '1', rideId: 'ride-1', at: cancelled[1].at, kind: 'CANCELLED', detail: cancelled[1].detail }), 'The ride was cancelled. Moved.')
})

test('history lines read as plain sentences', () => {
  const base = { id: '1', rideId: 'ride-1', at: '2026-10-18T16:00:00.000Z' }
  const front = { ...base, actorRole: 'PARTNER' as const, actorName: 'Belkin House' }
  const from = '2026-10-20T16:00:00.000Z'
  const to = '2026-10-20T17:00:00.000Z'
  assert.equal(rideEventText({ ...front, kind: 'REQUESTED' }), 'Belkin House booked the ride.')
  assert.equal(
    rideEventText({ ...front, kind: 'EDITED', detail: { fields: ['pickupTime', 'notes', 'destination'], fromPickupTime: from, toPickupTime: to } }),
    `Belkin House moved the pickup from ${formatDayTime(from)} to ${formatDayTime(to)} and changed the notes and destination.`,
  )
  assert.equal(rideEventText({ ...front, kind: 'EDITED', detail: { fields: [] } }), 'Belkin House updated the ride.')
  assert.equal(rideEventText({ ...base, kind: 'CANCELLED', detail: { reason: 'No driver accepted in time.', expired: true } }), 'CareRide cancelled the ride. No driver accepted in time.')
  assert.equal(rideEventText({ ...base, kind: 'COMPLETED', actorRole: 'DRIVER', actorName: 'Frank' }), 'Frank dropped off the client.')
  assert.equal(rideEventText({ ...base, kind: 'STEP_UNDONE', actorRole: 'DRIVER', actorName: 'Frank', detail: { undid: 'COMPLETED' } }), 'Frank took back the drop-off.')
  assert.equal(rideEventText({ ...base, kind: 'SENT_AGAIN', actorRole: 'PLATFORM_ADMIN', actorName: 'CareRide Admin' }), 'A CareRide admin asked drivers again.')
})

test('the demo backend logs who did each step of a ride, in order', async () => {
  const seeded = await mockService.listRideEvents('ride-past-1')
  assert.deepEqual(kinds(seeded), ['REQUESTED', 'DRIVER_ACCEPTED', 'PICKED_UP', 'COMPLETED'], 'seeded rides come with history')

  await mockService.signIn('belkin@careride.demo', PASSWORD)
  const booked = await mockService.requestRide(booking())
  await acceptAs('frank@careride.demo', 'd-frank', booked.id)

  await mockService.signIn('belkin@careride.demo', PASSWORD)
  const current = (await mockService.getRide(booked.id))!
  await mockService.updateRide(booked.id, { ...current, pickupTime: inHours(3), notes: 'Bring the walker' })
  await acceptAs('frank@careride.demo', 'd-frank', booked.id)
  await mockService.markDriverArrived(booked.id)
  await mockService.markPickedUp(booked.id)
  await mockService.markCompleted(booked.id)
  await mockService.undoDriverStep(booked.id, 'd-frank')
  await mockService.markCompleted(booked.id)

  const events = await mockService.listRideEvents(booked.id)
  assert.deepEqual(kinds(events), [
    'REQUESTED',
    'DRIVER_ACCEPTED',
    'EDITED',
    'DRIVER_ACCEPTED',
    'ARRIVED',
    'PICKED_UP',
    'COMPLETED',
    'STEP_UNDONE',
    'COMPLETED',
  ])
  assert.deepEqual(
    events.map((e) => e.actorName),
    ['Belkin House', 'Frank', 'Belkin House', 'Frank', 'Frank', 'Frank', 'Frank', 'Frank', 'Frank'],
  )
  assert.deepEqual(events[2].detail?.fields, ['pickupTime', 'notes'])
  assert.equal(events[2].detail?.fromPickupTime, current.pickupTime)

  // A driver who gives a ride up
  await mockService.signIn('belkin@careride.demo', PASSWORD)
  const second = await mockService.requestRide(booking({ pickupTime: inHours(6) }))
  await acceptAs('frank@careride.demo', 'd-frank', second.id)
  await mockService.dropRide(second.id, 'd-frank')
  assert.deepEqual(kinds(await mockService.listRideEvents(second.id)).slice(0, 3), ['REQUESTED', 'DRIVER_ACCEPTED', 'DRIVER_DROPPED'])
})

test('asking drivers again is logged even when nobody new can be asked', async () => {
  // Richmond has no wheelchair-accessible driver, so nobody can take this
  await mockService.signIn('richmond@careride.demo', PASSWORD)
  const stuck = await mockService.requestRide(
    booking({ orgId: 'org-richmond', houseId: 'house-richmond', requestedBy: 'u-richmond', pickupAddress: '12040 Horseshoe Way, Richmond', needsWheelchair: true }),
  )
  assert.equal(stuck.status, 'NEEDS_ATTENTION')
  await mockService.retryRide(stuck.id)
  await mockService.cancelRide(stuck.id, 'Booked a HandyDART instead.')
  const events = await mockService.listRideEvents(stuck.id)
  assert.deepEqual(kinds(events), ['REQUESTED', 'NO_DRIVER_AVAILABLE', 'SENT_AGAIN', 'CANCELLED'])
  assert.equal(events[3].detail?.reason, 'Booked a HandyDART instead.')
})

test('staff rate a finished ride, drivers flag issues, and only admins see both', async () => {
  await mockService.signIn('belkin@careride.demo', PASSWORD)
  const booked = await mockService.requestRide(booking({ pickupTime: inHours(4) }))
  await assert.rejects(mockService.giveFeedback(booked.id, { rating: 'UP' }), { message: FEEDBACK_NOT_YET })

  await acceptAs('frank@careride.demo', 'd-frank', booked.id)
  await mockService.markPickedUp(booked.id)
  await mockService.markCompleted(booked.id)
  await assert.rejects(mockService.giveFeedback(booked.id, { rating: 'DOWN' }), { message: ISSUE_REQUIRED })
  const flag = await mockService.giveFeedback(booked.id, { rating: 'DOWN', note: '  Front door was locked  ' })
  assert.equal(flag.rating, undefined, 'drivers flag, they do not rate')
  assert.equal(flag.note, 'Front door was locked')

  await mockService.signIn('belkin@careride.demo', PASSWORD)
  await assert.rejects(mockService.giveFeedback(booked.id, {}), { message: RATING_REQUIRED })
  await mockService.giveFeedback(booked.id, { rating: 'DOWN', note: 'Late' })
  const changed = await mockService.giveFeedback(booked.id, { rating: 'UP', note: 'Late, but kind' })
  const mine = await mockService.listMyFeedback()
  assert.deepEqual(
    mine.filter((f) => f.rideId === booked.id).map((f) => [f.rating, f.note]),
    [['UP', 'Late, but kind']],
    'a second rating replaces the first',
  )
  assert.equal(changed.driverId, 'd-frank')
  await assert.rejects(mockService.listFeedback({ driverId: 'd-frank' }))

  await mockService.signIn('richmond@careride.demo', PASSWORD)
  await assert.rejects(mockService.giveFeedback(booked.id, { rating: 'UP' }), { message: 'You can only give feedback on your own rides.' })

  await mockService.signIn('admin@careride.com', 'abcd1234')
  const forFrank = await mockService.listFeedback({ driverId: 'd-frank' })
  assert.deepEqual(forFrank.map((f) => f.authorRole).sort(), ['DRIVER', 'PARTNER'])
})
