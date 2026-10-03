import { isExpired, nextDriver, offerExpiry } from '../logic/dispatch'
import type { Driver, Ride, RideOffer } from '../types'
import type { DataService } from './dataService'
import { seed, type Database } from './seed'

// Hackathon backend: keeps everything in the browser's localStorage.
// Swap this file for a real backend later; screens won't need to change.

const STORAGE_KEY = 'careride-db'

function load(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Database
  } catch {
    // Storage unavailable or corrupt: fall back to seed data
  }
  return structuredClone(seed)
}

function save(db: Database): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Storage unavailable: changes last only for this session
  }
}

export function resetDemoData(): void {
  save(structuredClone(seed))
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function now(): string {
  return new Date().toISOString()
}

function findOrThrow<T extends { id: string }>(items: T[], id: string, label: string): T {
  const item = items.find((i) => i.id === id)
  if (!item) throw new Error(`${label} not found: ${id}`)
  return item
}

// Offers the ride to the next eligible driver, or flags it for staff.
function dispatch(db: Database, ride: Ride): void {
  const facility = db.facilities.find((f) => f.id === ride.facilityId)
  const driver = nextDriver(ride, facility, db.drivers, db.offers)
  if (!driver) {
    ride.status = 'NEEDS_ATTENTION'
    return
  }
  db.offers.push({
    id: newId('offer'),
    rideId: ride.id,
    driverId: driver.id,
    status: 'PENDING',
    sentAt: now(),
    expiresAt: offerExpiry(ride.type),
  })
  ride.status = 'OFFERED'
}

// Moves timed-out offers on to the next driver.
function expireOffers(db: Database): void {
  for (const offer of db.offers.filter((o) => isExpired(o))) {
    offer.status = 'EXPIRED'
    const ride = db.rides.find((r) => r.id === offer.rideId)
    if (ride?.status === 'OFFERED') dispatch(db, ride)
  }
}

// Runs a change against the database and saves it.
function transact<T>(fn: (db: Database) => T): Promise<T> {
  const db = load()
  expireOffers(db)
  const result = fn(db)
  save(db)
  return Promise.resolve(result)
}

export const mockService: DataService = {
  listUsers: () => transact((db) => db.users),

  registerOrganization: (org) =>
    transact((db) => {
      const created = { ...org, id: newId('org'), status: 'PENDING' as const }
      db.organizations.push(created)
      return created
    }),

  listOrganizations: () => transact((db) => db.organizations),

  addFacility: (facility) =>
    transact((db) => {
      const created = { ...facility, id: newId('fac') }
      db.facilities.push(created)
      return created
    }),

  listFacilities: (orgId) =>
    transact((db) => db.facilities.filter((f) => !orgId || f.orgId === orgId)),

  registerDriver: (user, driver) =>
    transact((db) => {
      const userId = newId('u')
      db.users.push({ ...user, id: userId, role: 'DRIVER' })
      const created: Driver = { ...driver, id: newId('d'), userId, status: 'PENDING', available: false }
      db.drivers.push(created)
      return created
    }),

  listDrivers: () => transact((db) => db.drivers),

  listPending: () =>
    transact((db) => ({
      orgs: db.organizations.filter((o) => o.status === 'PENDING'),
      drivers: db.drivers.filter((d) => d.status === 'PENDING'),
    })),

  setOrgStatus: (orgId, status) =>
    transact((db) => {
      const org = findOrThrow(db.organizations, orgId, 'Organization')
      org.status = status
      return org
    }),

  setDriverStatus: (driverId, status) =>
    transact((db) => {
      const driver = findOrThrow(db.drivers, driverId, 'Driver')
      driver.status = status
      return driver
    }),

  listDestinations: (city) =>
    transact((db) => db.destinations.filter((d) => !city || d.city === city)),

  saveDestination: (dest) =>
    transact((db) => {
      const created = { ...dest, id: newId('dest') }
      db.destinations.push(created)
      return created
    }),

  requestRide: (input) =>
    transact((db) => {
      const ride: Ride = { ...input, id: newId('ride'), status: 'SEARCHING', createdAt: now() }
      db.rides.push(ride)
      dispatch(db, ride)
      return ride
    }),

  getRide: (rideId) => transact((db) => db.rides.find((r) => r.id === rideId)),

  listRidesForFacility: (facilityId) =>
    transact((db) => db.rides.filter((r) => r.facilityId === facilityId)),

  listOffersForRide: (rideId) => transact((db) => db.offers.filter((o) => o.rideId === rideId)),

  retryRide: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      // Clear previous answers so everyone can be asked again
      db.offers = db.offers.filter((o) => o.rideId !== rideId || o.status === 'ACCEPTED')
      dispatch(db, ride)
      return ride
    }),

  cancelRide: (rideId, reason) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      ride.status = 'CANCELLED'
      ride.cancelReason = reason
      for (const o of db.offers) {
        if (o.rideId === rideId && o.status === 'PENDING') o.status = 'EXPIRED'
      }
      return ride
    }),

  setAvailability: (driverId, available) =>
    transact((db) => {
      const driver = findOrThrow(db.drivers, driverId, 'Driver')
      driver.available = available
      return driver
    }),

  listMyOffers: (driverId) =>
    transact((db) => db.offers.filter((o) => o.driverId === driverId && o.status === 'PENDING')),

  listMyRides: (driverId) => transact((db) => db.rides.filter((r) => r.driverId === driverId)),

  respondToOffer: (offerId, accept) =>
    transact((db) => {
      const offer: RideOffer = findOrThrow(db.offers, offerId, 'Offer')
      const ride = findOrThrow(db.rides, offer.rideId, 'Ride')
      if (offer.status !== 'PENDING') throw new Error('This request is no longer open.')
      offer.respondedAt = now()
      if (accept) {
        // Only one driver can accept a ride
        if (ride.driverId) throw new Error('Another driver already accepted this ride.')
        offer.status = 'ACCEPTED'
        ride.status = 'ACCEPTED'
        ride.driverId = offer.driverId
      } else {
        offer.status = 'DECLINED'
        dispatch(db, ride)
      }
      return ride
    }),

  dropRide: (rideId, driverId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      if (ride.driverId !== driverId) throw new Error('This ride belongs to another driver.')
      ride.driverId = undefined
      dispatch(db, ride)
      return ride
    }),

  markPickedUp: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      ride.status = 'PICKED_UP'
      return ride
    }),

  markCompleted: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      ride.status = 'COMPLETED'
      return ride
    }),

  getImpact: () =>
    transact((db) => {
      const completed = db.rides.filter((r) => r.status === 'COMPLETED')
      return {
        ridesCompleted: completed.length,
        moneySaved: completed.reduce((sum, r) => sum + r.estimatedFareSaved, 0),
        organizations: db.organizations.filter((o) => o.status === 'APPROVED').length,
        verifiedDrivers: db.drivers.filter((d) => d.status === 'APPROVED').length,
      }
    }),
}
