import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hoursOn, ALL_DAY } from '../src/logic/requestHours'
import { matchDrivers } from '../src/logic/matchDrivers'
import {
  canMarkNoShow,
  canWaitForDrivers,
  driversToAsk,
  editSendsRideAgain,
  isExpired,
  noDriverDeadline,
  NO_SHOW_WAIT_MINUTES,
  offerExpiry,
  partnerCloseCancelsRide,
  pickupTimeAfterEdit,
} from '../src/logic/dispatch'
import type { Driver, House, Ride, RideOffer } from '../src/types'

const anytime = hoursOn([0, 1, 2, 3, 4, 5, 6], ALL_DAY)
const never = hoursOn([], ALL_DAY)
const at = new Date('2026-10-04T18:00:00.000Z')

function driver(id: string, extra: Partial<Driver> = {}): Driver {
  return {
    id,
    userId: id,
    background: 'INDEPENDENT',
    vehicle: 'White sedan',
    wheelchairAccessible: false,
    seats: 3,
    serviceCities: ['Vancouver'],
    requestHours: anytime,
    status: 'APPROVED',
    ...extra,
  }
}

function ride(extra: Partial<Ride> = {}): Ride {
  return {
    id: 'ride-1',
    type: 'ON_DEMAND',
    orgId: 'org',
    houseId: 'house',
    requestedBy: 'staff',
    passengers: 1,
    pickupAddress: '1 Main St',
    destinationName: 'Clinic',
    destinationAddress: '2 Oak St',
    pickupTime: at.toISOString(),
    needsWheelchair: false,
    needsAssistance: false,
    status: 'SEARCHING',
    estimatedFareSaved: 2.58,
    createdAt: at.toISOString(),
    ...extra,
  }
}

const house: House = {
  id: 'house',
  orgId: 'org',
  name: 'Belkin House',
  address: '1 Main St',
  city: 'Vancouver',
  phone: '604-555-0120',
}

function offer(extra: Partial<RideOffer> = {}): RideOffer {
  return {
    id: 'offer-1',
    rideId: 'ride-1',
    driverId: 'frank',
    status: 'PENDING',
    sentAt: at.toISOString(),
    expiresAt: new Date(at.getTime() + 60_000).toISOString(),
    ...extra,
  }
}

test('offer windows are 5 minutes on demand and 60 when scheduled', () => {
  assert.equal(offerExpiry('ON_DEMAND', at), new Date(at.getTime() + 5 * 60_000).toISOString())
  assert.equal(offerExpiry('SCHEDULED', at), new Date(at.getTime() + 60 * 60_000).toISOString())
})

test('a pending offer is expired only once its deadline has passed', () => {
  assert.equal(isExpired(offer(), at), false)
  assert.equal(isExpired(offer({ expiresAt: at.toISOString() }), at), true)
  assert.equal(isExpired(offer({ status: 'DECLINED', expiresAt: at.toISOString() }), at), false)
})

test('an uncovered on-demand ride is called off 30 minutes after booking, a scheduled one at pickup', () => {
  assert.equal(noDriverDeadline(ride()).toISOString(), new Date(at.getTime() + 30 * 60_000).toISOString())
  assert.equal(noDriverDeadline(ride({ type: 'SCHEDULED' })).toISOString(), at.toISOString())
})

test('matching keeps approved drivers who fit the city, seats, wheelchair, and request hours', () => {
  const drivers = [
    driver('frank'),
    driver('pending', { status: 'PENDING' }),
    driver('richmond', { serviceCities: ['Richmond'] }),
    driver('full', { seats: 1 }),
    driver('van', { wheelchairAccessible: true, seats: 4 }),
    driver('off', { requestHours: never }),
  ]
  const walking = ride({ passengers: 2 })
  const ids = matchDrivers(walking, house, drivers, [], at).map((d) => d.id)
  assert.deepEqual(ids, ['frank', 'van'])

  const chair = ride({ needsWheelchair: true })
  assert.deepEqual(
    matchDrivers(chair, house, drivers, [], at).map((d) => d.id),
    ['van'],
  )
})

test('a preferred driver is asked alone, and someone already asked is skipped', () => {
  const frank = driver('frank')
  const maya = driver('maya')
  const preferred = ride({ preferredDriverId: 'maya' })
  assert.deepEqual(
    driversToAsk(preferred, house, [frank, maya], []).map((d) => d.id),
    ['maya'],
  )
  const asked: RideOffer[] = [offer({ driverId: 'maya', status: 'DECLINED' })]
  assert.deepEqual(
    driversToAsk(preferred, house, [frank, maya], asked).map((d) => d.id),
    ['frank'],
  )
})

test('a scheduled ride can wait for a driver whose request hours are closed right now', () => {
  const later = new Date(Date.now() + 24 * 60 * 60_000).toISOString()
  const scheduled = ride({ type: 'SCHEDULED', pickupTime: later })
  const sleepy = driver('frank', { requestHours: never })
  assert.equal(canWaitForDrivers(scheduled, house, [sleepy], []), true)
  assert.equal(canWaitForDrivers(ride(), house, [sleepy], []), false)
  assert.equal(canWaitForDrivers(scheduled, house, [], []), false)
})

test('a no-show waits until 10 minutes after the driver arrives', () => {
  const arrived = ride({ status: 'ACCEPTED', driverArrivedAt: at.toISOString() })
  assert.equal(canMarkNoShow(ride({ status: 'ACCEPTED' }), at.getTime()), false)
  assert.equal(canMarkNoShow(arrived, at.getTime() + (NO_SHOW_WAIT_MINUTES - 1) * 60_000), false)
  assert.equal(canMarkNoShow(arrived, at.getTime() + NO_SHOW_WAIT_MINUTES * 60_000), true)
})

test('closing a partner account leaves a ride the driver has already started', () => {
  assert.equal(partnerCloseCancelsRide(ride({ status: 'OFFERED' })), true)
  assert.equal(partnerCloseCancelsRide(ride({ status: 'ACCEPTED' })), true)
  assert.equal(partnerCloseCancelsRide(ride({ status: 'ACCEPTED', driverOnTheWayAt: at.toISOString() })), false)
  assert.equal(partnerCloseCancelsRide(ride({ status: 'ACCEPTED', driverArrivedAt: at.toISOString() })), false)
  assert.equal(partnerCloseCancelsRide(ride({ status: 'PICKED_UP' })), false)
})

test('notes keep an on-demand give-up clock, and a new destination restarts it', () => {
  const before = ride()
  const notes = { ...before, notes: 'Meet in the lobby' }
  assert.equal(editSendsRideAgain(before, notes), false)
  assert.equal(pickupTimeAfterEdit(before, notes, '2026-10-04T19:00:00.000Z'), before.pickupTime)

  const moved = { ...before, destinationAddress: '9 Pine St' }
  assert.equal(editSendsRideAgain(before, moved), true)
  assert.equal(pickupTimeAfterEdit(before, moved, '2026-10-04T19:00:00.000Z'), '2026-10-04T19:00:00.000Z')

  const later = { ...before, type: 'SCHEDULED' as const, pickupTime: '2026-10-05T18:00:00.000Z' }
  assert.equal(editSendsRideAgain(before, later), true)
  assert.equal(pickupTimeAfterEdit(before, later, '2026-10-04T19:00:00.000Z'), later.pickupTime)
})
