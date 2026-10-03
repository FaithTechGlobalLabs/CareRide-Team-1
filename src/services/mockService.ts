import { MIN_PASSWORD_LENGTH } from '../constants'
import { isExpired, nextDriver, offerExpiry } from '../logic/dispatch'
import type { Driver, Organization, Ride, RideStatus, User } from '../types'
import type { DataService } from './dataService'
import { seed, type Database } from './seed'

// Hackathon backend: keeps everything in the browser's localStorage.
// Swap this file for a real backend later; screens won't need to change.

const STORAGE_KEY = 'careride-db-v3'

const OPEN: RideStatus[] = ['SEARCHING', 'OFFERED']

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

function closePendingOffers(db: Database, rideId: string): void {
  for (const o of db.offers) {
    if (o.rideId === rideId && o.status === 'PENDING') o.status = 'EXPIRED'
  }
}

// Offers the ride to the next eligible driver, or flags it for the house.
function dispatch(db: Database, ride: Ride): void {
  const house = db.houses.find((h) => h.id === ride.houseId)
  const driver = nextDriver(ride, house, db.drivers, db.offers)
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

// Moves timed-out offers on, and flags rides whose pickup time passed without a driver.
function checkDeadlines(db: Database): void {
  for (const offer of db.offers.filter((o) => isExpired(o))) {
    offer.status = 'EXPIRED'
    const ride = db.rides.find((r) => r.id === offer.rideId)
    if (ride?.status === 'OFFERED') dispatch(db, ride)
  }
  for (const ride of db.rides) {
    if (OPEN.includes(ride.status) && new Date(ride.pickupTime) <= new Date()) {
      closePendingOffers(db, ride.id)
      ride.status = 'NEEDS_ATTENTION'
    }
  }
}

// Runs a change against the database and saves it.
// Nothing is saved if the change throws.
function transact<T>(fn: (db: Database) => T): Promise<T> {
  try {
    const db = load()
    checkDeadlines(db)
    const result = fn(db)
    save(db)
    return Promise.resolve(result)
  } catch (err) {
    return Promise.reject(err)
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function addLogin(db: Database, userId: string, email: string, password: string): void {
  const normalized = normalizeEmail(email)
  if (db.credentials.some((c) => c.email === normalized)) {
    throw new Error('An account with this email already exists.')
  }
  db.credentials.push({ email: normalized, userId, password })
}

// Readable temporary password for a new house account, e.g. "ride-4821".
function tempPassword(): string {
  return `ride-${Math.floor(1000 + Math.random() * 9000)}`
}

function driverIdsForOrg(db: Database, orgId: string): string[] {
  return db.drivers.filter((d) => d.orgId === orgId).map((d) => d.id)
}

export const mockService: DataService = {
  listUsers: () => transact((db) => db.users),

  signIn: (email, password) =>
    transact((db) => {
      const login = db.credentials.find((c) => c.email === normalizeEmail(email))
      const user = login && login.password === password && db.users.find((u) => u.id === login.userId)
      if (!user) throw new Error("That email and password don't match. Please try again.")
      return user
    }),

  isEmailAvailable: (email) =>
    transact((db) => !db.credentials.some((c) => c.email === normalizeEmail(email))),

  registerOrganization: (org, admin) =>
    transact((db) => {
      const created: Organization = { ...org, id: newId('org'), status: 'PENDING' }
      const user: User = {
        id: newId('u'),
        name: admin.name,
        email: normalizeEmail(admin.email),
        phone: org.contactPhone,
        role: 'ORG_ADMIN',
        orgId: created.id,
      }
      addLogin(db, user.id, admin.email, admin.password)
      db.organizations.push(created)
      db.users.push(user)
      return { org: created, user }
    }),

  listOrganizations: () => transact((db) => db.organizations),

  addHouse: (house, loginEmail) =>
    transact((db) => {
      const created = { ...house, id: newId('house') }
      // One shared account per house, not one per case manager
      const user: User = {
        id: newId('u'),
        name: house.name,
        email: loginEmail ? normalizeEmail(loginEmail) : undefined,
        phone: house.phone,
        role: 'HOUSE',
        orgId: house.orgId,
        houseId: created.id,
      }
      const password = loginEmail ? tempPassword() : undefined
      if (loginEmail && password) addLogin(db, user.id, loginEmail, password)
      db.houses.push(created)
      db.users.push(user)
      return { house: created, tempPassword: password }
    }),

  listHouses: (orgId) => transact((db) => db.houses.filter((h) => !orgId || h.orgId === orgId)),

  registerDriver: (newUser, driver, login) =>
    transact((db) => {
      const user: User = {
        ...newUser,
        id: newId('u'),
        email: login ? normalizeEmail(login.email) : undefined,
        role: 'DRIVER',
        orgId: driver.orgId,
      }
      if (login) addLogin(db, user.id, login.email, login.password)
      const created: Driver = { ...driver, id: newId('d'), userId: user.id, status: 'PENDING', available: true }
      db.users.push(user)
      db.drivers.push(created)
      return { driver: created, user }
    }),

  listDrivers: (orgId) => transact((db) => db.drivers.filter((d) => !orgId || d.orgId === orgId)),

  setAvailability: (driverId, available) =>
    transact((db) => {
      const driver = findOrThrow(db.drivers, driverId, 'Driver')
      driver.available = available
      return driver
    }),

  listAccounts: () =>
    transact((db) => {
      const withLogin = new Set(db.credentials.map((c) => c.userId))
      return db.users.filter((u) => withLogin.has(u.id))
    }),

  resetPassword: (userId, newPassword) =>
    transact((db) => {
      const login = db.credentials.find((c) => c.userId === userId)
      if (!login) throw new Error("This account doesn't have a sign-in.")
      const password = newPassword ?? tempPassword()
      if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      login.password = password
      return { email: login.email, password }
    }),

  deleteAccount: (userId) =>
    transact((db) => {
      const user = findOrThrow(db.users, userId, 'Account')
      if (user.role === 'PLATFORM_ADMIN' && db.users.filter((u) => u.role === 'PLATFORM_ADMIN').length === 1) {
        throw new Error("This is the only CareRide admin account, so it can't be deleted.")
      }

      const driver = db.drivers.find((d) => d.userId === userId)
      if (driver) {
        if (db.rides.some((r) => r.driverId === driver.id && r.status === 'PICKED_UP')) {
          throw new Error('This driver has a client in the car right now. Try again once the ride is finished.')
        }
        db.drivers = db.drivers.filter((d) => d.id !== driver.id)
        // Requests waiting on them move to the next driver
        for (const offer of db.offers.filter((o) => o.driverId === driver.id && o.status === 'PENDING')) {
          offer.status = 'EXPIRED'
          const ride = db.rides.find((r) => r.id === offer.rideId)
          if (ride?.status === 'OFFERED') dispatch(db, ride)
        }
        // Upcoming rides they accepted go back out
        for (const ride of db.rides.filter((r) => r.driverId === driver.id && r.status === 'ACCEPTED')) {
          ride.driverId = undefined
          dispatch(db, ride)
        }
      }

      db.credentials = db.credentials.filter((c) => c.userId !== userId)
      db.users = db.users.filter((u) => u.id !== userId)
    }),

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

  listDestinations: (orgId) =>
    transact((db) => db.destinations.filter((d) => !orgId || d.orgId === orgId)),

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

  listRidesForHouse: (houseId) => transact((db) => db.rides.filter((r) => r.houseId === houseId)),

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
      closePendingOffers(db, rideId)
      return ride
    }),

  listMyOffers: (driverId) =>
    transact((db) => db.offers.filter((o) => o.driverId === driverId && o.status === 'PENDING')),

  listOffersForOrg: (orgId) =>
    transact((db) => {
      const ids = driverIdsForOrg(db, orgId)
      return db.offers.filter((o) => ids.includes(o.driverId) && o.status === 'PENDING')
    }),

  listMyRides: (driverId) => transact((db) => db.rides.filter((r) => r.driverId === driverId)),

  listRidesForOrg: (orgId) =>
    transact((db) => {
      const ids = driverIdsForOrg(db, orgId)
      return db.rides.filter((r) => r.driverId && ids.includes(r.driverId))
    }),

  respondToOffer: (offerId, accept) =>
    transact((db) => {
      const offer = findOrThrow(db.offers, offerId, 'Offer')
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
      ride.completedAt = now()
      return ride
    }),

  markNoShow: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      ride.status = 'NO_SHOW'
      ride.cancelReason = 'Client did not show up. The ride is lost.'
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
