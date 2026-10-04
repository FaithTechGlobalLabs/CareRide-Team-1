import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAPACITY_LOCKED } from '../src/logic/capacity'
import { NO_SHOW_NOT_HERE, NO_SHOW_TOO_SOON } from '../src/logic/dispatch'
import type { DataService } from '../src/services/dataService'
import type { Ride } from '../src/types'

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

function booking(pickupTime: string, destinationAddress = '1081 Burrard St, Vancouver'): Parameters<DataService['requestRide']>[0] {
  return {
    type: 'ON_DEMAND',
    orgId: 'org-belkin',
    houseId: 'house-belkin',
    requestedBy: 'u-belkin',
    passengers: 1,
    riderNames: ['Alex'],
    pickupAddress: '555 Homer St, Vancouver',
    destinationName: "St. Paul's Hospital",
    destinationAddress,
    pickupTime,
    needsWheelchair: false,
    needsAssistance: false,
    estimatedFareSaved: 2.58,
  }
}

function changes(ride: Ride, extra: Partial<Ride> = {}) {
  return {
    type: ride.type,
    pickupTime: ride.pickupTime,
    passengers: ride.passengers,
    riderNames: ride.riderNames,
    needsWheelchair: ride.needsWheelchair,
    needsAssistance: ride.needsAssistance,
    pickupInstructions: ride.pickupInstructions,
    notes: ride.notes,
    destinationId: ride.destinationId,
    destinationName: ride.destinationName,
    destinationAddress: ride.destinationAddress,
    ...extra,
  }
}

test('the demo backend keeps an on-demand clock on a notes edit, and blocks an early no-show', async () => {
  await mockService.signIn('belkin@careride.demo', PASSWORD)
  const pickupTime = new Date().toISOString()
  const booked = await mockService.requestRide(booking(pickupTime))
  const noted = await mockService.updateRide(booked.id, changes(booked, { notes: 'Meet in the lobby' }))
  assert.equal(noted.pickupTime, pickupTime)
  assert.equal(noted.notes, 'Meet in the lobby')
  assert.equal(noted.status, booked.status)

  await mockService.signIn('frank@careride.demo', PASSWORD)
  const offers = await mockService.listMyOffers('d-frank')
  const mine = offers.find((offer) => offer.rideId === booked.id)
  assert.ok(mine)
  await mockService.respondToOffer(mine.id, true)
  await assert.rejects(mockService.markNoShow(booked.id), { message: NO_SHOW_NOT_HERE })
  await mockService.markDriverArrived(booked.id)
  await assert.rejects(mockService.markNoShow(booked.id), { message: NO_SHOW_TOO_SOON })
  await mockService.markOnTheWay(booked.id)

  const second = await mockService.requestRide(booking(new Date().toISOString(), '899 W 12th Ave, Vancouver'))
  await mockService.signIn('belkin@careride.demo', PASSWORD)
  await mockService.deleteMyAccount()

  const started = await mockService.getRide(booked.id)
  const waiting = await mockService.getRide(second.id)
  assert.equal(started?.status, 'ACCEPTED')
  assert.ok(started?.driverOnTheWayAt)
  assert.equal(waiting?.status, 'CANCELLED')
})

test('an approved driver can change their vehicle description, not how many people it holds', async () => {
  await mockService.signIn('frank@careride.demo', PASSWORD)
  await assert.rejects(mockService.updateDriver('d-frank', { seats: 8 }), { message: CAPACITY_LOCKED })
  const saved = await mockService.updateDriver('d-frank', { vehicle: 'Black SUV with a roof rack' })
  assert.equal(saved.vehicle, 'Black SUV with a roof rack')
  assert.equal(saved.seats, 3)
  assert.equal(saved.wheelchairAccessible, false)

  const pending = await mockService.updateDriver('d-jordan', { seats: 2, wheelchairAccessible: true })
  assert.equal(pending.seats, 2)
  assert.equal(pending.wheelchairAccessible, true)
})
