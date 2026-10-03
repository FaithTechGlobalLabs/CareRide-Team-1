import { MIN_PASSWORD_LENGTH } from '../constants'
import { driversToAsk, isExpired, offerExpiry } from '../logic/dispatch'
import { DEFAULT_REQUEST_HOURS, hoursOn } from '../logic/requestHours'
import type { Driver, Organization, Ride, RideStatus, User } from '../types'
import type { DataService } from './dataService'
import { seed, type Database } from './seed'

// Hackathon backend: keeps everything in the browser's localStorage.
// Swap this file for a real backend later; screens won't need to change.

const STORAGE_KEY = 'careride-db-v4'

const OPEN: RideStatus[] = ['SEARCHING', 'OFFERED']

// Older saves gave drivers one block of days and hours ("availability").
// Turn that into request hours so existing demo accounts keep working.
function migrate(db: Database): Database {
  for (const driver of db.drivers) {
    const old = (driver as Driver & { availability?: { days: number[]; from: string; to: string } }).availability
    if (!driver.requestHours) driver.requestHours = old ? hoursOn(old.days, { from: old.from, to: old.to }) : DEFAULT_REQUEST_HOURS
    delete (driver as { availability?: unknown }).availability
  }
  return db
}

function load(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw) as Database)
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

function hasPendingOffers(db: Database, rideId: string): boolean {
  return db.offers.some((o) => o.rideId === rideId && o.status === 'PENDING')
}

// Drivers with a client in the car can't take an on-demand ride right now.
function busyDriverIds(db: Database, ride: Ride): string[] {
  if (ride.type !== 'ON_DEMAND') return []
  return db.rides.filter((r) => r.status === 'PICKED_UP' && r.driverId).map((r) => r.driverId!)
}

// Sends the ride to every driver who can take it right now, or flags it for the house.
function dispatch(db: Database, ride: Ride): void {
  const house = db.houses.find((h) => h.id === ride.houseId)
  const drivers = driversToAsk(ride, house, db.drivers, db.offers, busyDriverIds(db, ride))
  if (drivers.length === 0) {
    ride.status = hasPendingOffers(db, ride.id) ? 'OFFERED' : 'NEEDS_ATTENTION'
    return
  }
  const sentAt = now()
  for (const driver of drivers) {
    db.offers.push({
      id: newId('offer'),
      rideId: ride.id,
      driverId: driver.id,
      status: 'PENDING',
      sentAt,
      expiresAt: offerExpiry(ride.type),
    })
  }
  ride.status = 'OFFERED'
}

// Once nobody is left to answer, asks the next drivers (if any).
function dispatchIfUnanswered(db: Database, rideId: string): void {
  const ride = db.rides.find((r) => r.id === rideId)
  if (ride?.status === 'OFFERED' && !hasPendingOffers(db, rideId)) dispatch(db, ride)
}

// Moves timed-out offers on, and flags rides whose pickup time passed without a driver.
function checkDeadlines(db: Database): void {
  const expired = db.offers.filter((o) => isExpired(o))
  for (const offer of expired) offer.status = 'EXPIRED'
  for (const rideId of new Set(expired.map((o) => o.rideId))) dispatchIfUnanswered(db, rideId)
  for (const ride of db.rides) {
    if (OPEN.includes(ride.status) && ride.type !== 'ON_DEMAND' && new Date(ride.pickupTime) <= new Date()) {
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

  updateDriver: (driverId, changes) =>
    transact((db) => {
      const driver = findOrThrow(db.drivers, driverId, 'Driver')
      Object.assign(driver, changes)
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
          dispatchIfUnanswered(db, offer.rideId)
        }
        // Upcoming rides they accepted go back out
        for (const ride of db.rides.filter((r) => r.driverId === driver.id && r.status === 'ACCEPTED')) {
          ride.driverId = undefined
          ride.acceptedAt = undefined
          ride.driverArrivedAt = undefined
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
      // On-demand rides are picked up as soon as possible, so their pickup time is the booking time.
      if (input.type === 'SCHEDULED' && new Date(input.pickupTime).getTime() <= Date.now()) {
        throw new Error('Pick a time in the future.')
      }
      const ride: Ride = { ...input, id: newId('ride'), status: 'SEARCHING', createdAt: now() }
      db.rides.push(ride)
      dispatch(db, ride)
      return ride
    }),

  getRide: (rideId) => transact((db) => db.rides.find((r) => r.id === rideId)),

  listRidesForHouse: (houseId) => transact((db) => db.rides.filter((r) => r.houseId === houseId)),

  listRidesRequestedByOrg: (orgId) => transact((db) => db.rides.filter((r) => r.orgId === orgId)),

  listOffersForRide: (rideId) => transact((db) => db.offers.filter((o) => o.rideId === rideId)),

  retryRide: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      // Clear previous answers so everyone can be asked again, except drivers who already dropped it
      db.offers = db.offers.filter(
        (o) => o.rideId !== rideId || o.status === 'ACCEPTED' || o.status === 'WITHDRAWN',
      )
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
      if (offer.status !== 'PENDING') {
        throw new Error(ride.driverId ? 'Another driver already accepted this ride.' : 'This request is no longer open.')
      }
      offer.respondedAt = now()
      if (accept) {
        // Only one driver can accept a ride: the first yes wins, everyone else's request closes
        if (ride.driverId) throw new Error('Another driver already accepted this ride.')
        offer.status = 'ACCEPTED'
        closePendingOffers(db, ride.id)
        ride.status = 'ACCEPTED'
        ride.driverId = offer.driverId
        ride.acceptedAt = offer.respondedAt
      } else {
        offer.status = 'DECLINED'
        dispatchIfUnanswered(db, ride.id)
      }
      return ride
    }),

  dropRide: (rideId, driverId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      if (ride.driverId !== driverId) throw new Error('This ride belongs to another driver.')
      // Mark their acceptance as withdrawn, so they aren't asked again and the house can see it
      for (const o of db.offers) {
        if (o.rideId === rideId && o.driverId === driverId && o.status === 'ACCEPTED') o.status = 'WITHDRAWN'
      }
      ride.droppedBy = { driverId, at: now() }
      ride.driverId = undefined
      ride.acceptedAt = undefined
      ride.driverArrivedAt = undefined
      dispatch(db, ride)
      return ride
    }),

  markDriverArrived: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      if (ride.status !== 'ACCEPTED') throw new Error('You can only say you are here on a confirmed ride.')
      ride.driverArrivedAt = now()
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
