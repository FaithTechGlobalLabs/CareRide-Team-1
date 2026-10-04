import { MIN_PASSWORD_LENGTH } from '../constants'
import { DEMO_FRAME_USER } from '../context/demoFrame'
import { maxPassengers } from '../logic/capacity'
import { UNDO_FINISH_MINUTES, canWaitForDrivers, driversToAsk, isExpired, noDriverDeadline, offerExpiry } from '../logic/dispatch'
import type { Driver, House, OfferStatus, Organization, Ride, RideStatus, User } from '../types'
import type { DataService, NewAccount, NewDriver, NewDriverUser, RideChanges } from './dataService'
import { seed, type Database } from './seed'

// Hackathon backend: keeps everything in the browser's localStorage.
// Swap this file for a real backend later; screens won't need to change.

// v5: houses and their organizations became single partner organizations.
// Older saves can't be mapped onto that, so they start again from the seed.
// v6: real house addresses and each house's frequent destinations.
// v7: each completed trip counts as a one-zone Vancouver bus fare.
export const STORAGE_KEY = 'careride-db-v7'
const OLD_STORAGE_KEYS = ['careride-db-v6', 'careride-db-v5', 'careride-db-v4', 'careride-db-v3']

// Still waiting for a driver: these expire if nobody accepts in time
const WAITING: RideStatus[] = ['SEARCHING', 'OFFERED', 'NEEDS_ATTENTION']

function load(): Database {
  try {
    for (const key of OLD_STORAGE_KEYS) localStorage.removeItem(key)
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

// The demo session is saved in localStorage so people stay signed in when they come back
// to the site or reopen the phone app. Each tab also keeps its own copy in
// sessionStorage, which wins on reload, so two tabs signed in as different people
// (e.g. a house and a driver) don't swap accounts. A new tab picks up whoever
// signed in last. A /demo frame is always the person the deck asked for.
const SESSION_KEY = 'careride-session-v3'
const sessionListeners = new Set<() => void>()

function readSession(): string {
  if (DEMO_FRAME_USER) return DEMO_FRAME_USER
  try {
    const tabSession = sessionStorage.getItem(SESSION_KEY)
    if (tabSession) return tabSession
    const saved = localStorage.getItem(SESSION_KEY) ?? ''
    if (saved) sessionStorage.setItem(SESSION_KEY, saved)
    return saved
  } catch {
    return ''
  }
}

function writeSession(userId: string): void {
  if (DEMO_FRAME_USER) return
  try {
    if (userId) {
      sessionStorage.setItem(SESSION_KEY, userId)
      localStorage.setItem(SESSION_KEY, userId)
    } else {
      sessionStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(SESSION_KEY)
    }
  } catch {
    // Ignore: the session just won't survive a reload
  }
}

export function resetDemoData(): void {
  save(structuredClone(seed))
  // The signed-in account may not exist in the fresh data
  sessionListeners.forEach((listener) => listener())
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function now(): string {
  return new Date().toISOString()
}

// Each step of a ride can only follow the one before it, e.g. no pickup on a cancelled ride.
// Two tabs (or a slow refresh) can show a button for a step that no longer applies.
function requireStatus(ride: Ride, allowed: RideStatus[], message: string): void {
  if (!allowed.includes(ride.status)) throw new Error(message)
}

function cantChange(ride: Ride): string {
  switch (ride.status) {
    case 'CANCELLED':
      return 'This ride was cancelled.'
    case 'PICKED_UP':
      return 'The client is already in the car.'
    case 'COMPLETED':
    case 'NO_SHOW':
      return 'This ride is already finished.'
    default:
      return 'This ride has changed. Please check it again.'
  }
}

function findOrThrow<T extends { id: string }>(items: T[], id: string, label: string): T {
  const item = items.find((i) => i.id === id)
  if (!item) throw new Error(`${label} not found: ${id}`)
  return item
}

// Forgets where the driver was up to, e.g. when the ride goes back out to other drivers.
function clearDriverProgress(ride: Ride): void {
  ride.driverId = undefined
  ride.acceptedAt = undefined
  ride.driverOnTheWayAt = undefined
  ride.driverEta = undefined
  ride.driverArrivedAt = undefined
}

function checkPassengers(db: Database, passengers: number): void {
  const max = maxPassengers(db.drivers)
  if (!Number.isInteger(passengers) || passengers < 1) throw new Error('Add at least 1 passenger.')
  if (passengers > max) throw new Error(`A ride can take up to ${max} passengers. Book two rides for a bigger group.`)
}

function checkPickupTime(ride: Pick<Ride, 'type' | 'pickupTime'>): void {
  // On-demand rides are picked up as soon as possible, so their pickup time is the booking time.
  if (ride.type === 'SCHEDULED' && new Date(ride.pickupTime).getTime() <= Date.now()) {
    throw new Error('Pick a time in the future.')
  }
}

function cleanNames(names: string[] | undefined, passengers: number): string[] | undefined {
  const kept = (names ?? []).slice(0, passengers).map((n) => n.trim())
  return kept.some(Boolean) ? kept : undefined
}

function closePendingOffers(db: Database, rideId: string, status: OfferStatus = 'EXPIRED'): void {
  for (const o of db.offers) {
    if (o.rideId === rideId && o.status === 'PENDING') o.status = status
  }
}

function hasPendingOffers(db: Database, rideId: string): boolean {
  return db.offers.some((o) => o.rideId === rideId && o.status === 'PENDING')
}

// Drivers on their way to an on-demand pickup, or with a client in the car, can't take an on-demand ride right now.
// The outbound trip of a return doesn't count: that driver is the best one to bring the client back.
function busyDriverIds(db: Database, ride: Ride): string[] {
  if (ride.type !== 'ON_DEMAND') return []
  return db.rides
    .filter((r) => r.id !== ride.returnOfRideId)
    .filter((r) => r.driverId && (r.status === 'PICKED_UP' || (r.status === 'ACCEPTED' && r.type === 'ON_DEMAND')))
    .map((r) => r.driverId!)
}

// Sends the ride to every driver who can take it right now, or flags it for the house.
function dispatch(db: Database, ride: Ride): void {
  const house = db.houses.find((h) => h.id === ride.houseId)
  const drivers = driversToAsk(ride, house, db.drivers, db.offers, busyDriverIds(db, ride))
  if (drivers.length === 0) {
    if (hasPendingOffers(db, ride.id)) ride.status = 'OFFERED'
    else if (canWaitForDrivers(ride, house, db.drivers, db.offers)) ride.status = 'SEARCHING'
    else ride.status = 'NEEDS_ATTENTION'
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

// Moves timed-out offers on, asks drivers whose request hours just opened,
// and cancels rides nobody accepted in time (see noDriverDeadline).
function checkDeadlines(db: Database): void {
  const expired = db.offers.filter((o) => isExpired(o))
  for (const offer of expired) offer.status = 'EXPIRED'
  for (const rideId of new Set(expired.map((o) => o.rideId))) dispatchIfUnanswered(db, rideId)
  const now = new Date()
  for (const ride of db.rides) {
    if (WAITING.includes(ride.status) && noDriverDeadline(ride) <= now) {
      closePendingOffers(db, ride.id)
      ride.status = 'CANCELLED'
      ride.expired = true
      ride.cancelledAt = now.toISOString()
      ride.cancelReason =
        ride.type === 'ON_DEMAND' ? 'No driver accepted in time.' : 'No driver accepted before the pickup time.'
    } else if (ride.status === 'SEARCHING') {
      dispatch(db, ride)
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

// Readable temporary password, e.g. "ride-4821".
function tempPassword(): string {
  return `ride-${Math.floor(1000 + Math.random() * 9000)}`
}

function addDriver(
  db: Database,
  newUser: NewDriverUser,
  driver: NewDriver,
  login?: Pick<NewAccount, 'email' | 'password'>,
): { driver: Driver; user: User } {
  const user: User = {
    ...newUser,
    id: newId('u'),
    email: login ? normalizeEmail(login.email) : undefined,
    role: 'DRIVER',
    orgId: driver.orgId,
  }
  if (login) addLogin(db, user.id, login.email, login.password)
  const created: Driver = { ...driver, id: newId('d'), userId: user.id, status: 'PENDING' }
  db.users.push(user)
  db.drivers.push(created)
  return { driver: created, user }
}

function driverIdsForOrg(db: Database, orgId: string): string[] {
  return db.drivers.filter((d) => d.orgId === orgId).map((d) => d.id)
}

export const mockService: DataService = {
  restoreSession: () =>
    transact((db) => {
      const userId = readSession()
      const user = db.users.find((u) => u.id === userId)
      if (userId && !user) writeSession('') // account was removed or the demo was reset
      return user
    }),

  signIn: (email, password) =>
    transact((db) => {
      const login = db.credentials.find((c) => c.email === normalizeEmail(email))
      const user = login && login.password === password && db.users.find((u) => u.id === login.userId)
      if (!user) throw new Error("That email and password don't match. Please try again.")
      writeSession(user.id)
      return user
    }),

  signOut: () => {
    writeSession('')
    return Promise.resolve()
  },

  onSessionChange: (listener) => {
    sessionListeners.add(listener)
    return () => sessionListeners.delete(listener)
  },

  // Tabs share localStorage, so the app's storage listener and polling already cover this.
  onDataChange: () => () => {},

  // The demo can't send email; the sign-in page tells people to ask their admin instead.
  requestPasswordReset: () => Promise.reject(new Error("Ask your organization's admin to reset your password.")),

  updatePassword: (newPassword) =>
    transact((db) => {
      if (newPassword.length < MIN_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      const login = db.credentials.find((c) => c.userId === readSession())
      if (!login) throw new Error('Please sign in first.')
      login.password = newPassword
    }),

  listUsers: () => transact((db) => db.users),

  isEmailAvailable: (email) =>
    transact((db) => !db.credentials.some((c) => c.email === normalizeEmail(email))),

  registerOrganization: (org, account, location, destinations = []) =>
    transact((db) => {
      const created: Organization = { ...org, id: newId('org'), status: 'PENDING' }
      const isPartner = org.type === 'PARTNER_ORG'
      if (isPartner && !location) throw new Error('Add the address where rides start.')
      // A partner organization is one location: its account is shared by the staff there, so it carries the org's name
      const house: House | undefined =
        isPartner && location ? { ...location, id: newId('house'), orgId: created.id, name: org.name } : undefined
      const user: User = {
        id: newId('u'),
        name: isPartner ? org.name : account.name,
        email: normalizeEmail(account.email),
        phone: org.contactPhone,
        role: isPartner ? 'PARTNER' : 'ORG_ADMIN',
        orgId: created.id,
        houseId: house?.id,
      }
      addLogin(db, user.id, account.email, account.password)
      db.organizations.push(created)
      if (house) db.houses.push(house)
      db.users.push(user)
      for (const dest of destinations) db.destinations.push({ ...dest, id: newId('dest'), orgId: created.id })
      return { status: 'SIGNED_IN', user }
    }),

  listOrganizations: () => transact((db) => db.organizations),

  listHouses: (orgId) => transact((db) => db.houses.filter((h) => !orgId || h.orgId === orgId)),

  registerDriver: (newUser, driver, login) =>
    transact((db) => {
      const { user } = addDriver(db, newUser, driver, login)
      return { status: 'SIGNED_IN', user }
    }),

  // The mock trusts driver.orgId; a real backend uses the signed-in organization instead.
  addOrgDriver: (newUser, driver) => transact((db) => addDriver(db, newUser, driver).driver),

  listDrivers: (orgId) => transact((db) => db.drivers.filter((d) => !orgId || d.orgId === orgId)),

  listDriverPool: () => transact((db) => db.drivers.filter((d) => d.status === 'APPROVED')),

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
      return { kind: 'NEW_PASSWORD', email: login.email, password }
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
          clearDriverProgress(ride)
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
      checkPickupTime(input)
      checkPassengers(db, input.passengers)
      if (!input.destinationAddress.trim()) throw new Error('Choose where the ride is going.')
      const ride: Ride = {
        ...input,
        riderNames: cleanNames(input.riderNames, input.passengers),
        id: newId('ride'),
        status: 'SEARCHING',
        createdAt: now(),
      }
      db.rides.push(ride)
      dispatch(db, ride)
      return ride
    }),

  updateRide: (rideId, changes) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      requireStatus(ride, ['SEARCHING', 'OFFERED', 'NEEDS_ATTENTION', 'ACCEPTED'], cantChange(ride))
      // An on-demand ride is wanted now, so editing it restarts the clock
      const next: RideChanges = { ...changes, pickupTime: changes.type === 'ON_DEMAND' ? now() : changes.pickupTime }
      checkPickupTime(next)
      checkPassengers(db, next.passengers)
      if (!next.destinationAddress.trim()) throw new Error('Choose where the ride is going.')

      // Changing when, where, or who means drivers must look at the ride again. Notes and names don't.
      const resend =
        next.type !== ride.type ||
        (next.type === 'SCHEDULED' && next.pickupTime !== ride.pickupTime) ||
        next.passengers !== ride.passengers ||
        next.needsWheelchair !== ride.needsWheelchair ||
        next.destinationAddress !== ride.destinationAddress

      Object.assign(ride, next, { riderNames: cleanNames(next.riderNames, next.passengers), changedAt: now() })
      if (!resend) return ride

      // Earlier answers were about the old ride: ask again, with the driver who had accepted asked first.
      // Drivers who dropped it already said they can't make it, so they stay out.
      const previousDriverId = ride.driverId
      closePendingOffers(db, rideId)
      db.offers = db.offers.filter((o) => o.rideId !== rideId || o.status === 'WITHDRAWN')
      if (previousDriverId) {
        clearDriverProgress(ride)
        ride.preferredDriverId = previousDriverId
        ride.reconfirmDriverId = previousDriverId
      }
      ride.status = 'SEARCHING'
      dispatch(db, ride)
      return ride
    }),

  getRide: (rideId) => transact((db) => db.rides.find((r) => r.id === rideId)),

  listRidesForHouse: (houseId) => transact((db) => db.rides.filter((r) => r.houseId === houseId)),

  listOffersForRide: (rideId) => transact((db) => db.offers.filter((o) => o.rideId === rideId)),

  retryRide: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      requireStatus(ride, ['NEEDS_ATTENTION'], cantChange(ride))
      if (noDriverDeadline(ride) <= new Date()) throw new Error('The pickup time has passed. Please book a new ride.')
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
      requireStatus(ride, ['SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION'], cantChange(ride))
      ride.status = 'CANCELLED'
      ride.cancelReason = reason
      ride.cancelledAt = now()
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
        closePendingOffers(db, ride.id, 'TAKEN')
        ride.status = 'ACCEPTED'
        ride.driverId = offer.driverId
        ride.acceptedAt = offer.respondedAt
        ride.reconfirmDriverId = undefined
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
      requireStatus(ride, ['ACCEPTED'], cantChange(ride))
      // Mark their acceptance as withdrawn, so they aren't asked again and the house can see it
      for (const o of db.offers) {
        if (o.rideId === rideId && o.driverId === driverId && o.status === 'ACCEPTED') o.status = 'WITHDRAWN'
      }
      ride.droppedBy = { driverId, at: now() }
      clearDriverProgress(ride)
      dispatch(db, ride)
      return ride
    }),

  markOnTheWay: (rideId, etaMinutes) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      requireStatus(ride, ['ACCEPTED'], cantChange(ride))
      ride.driverOnTheWayAt = now()
      ride.driverEta =
        etaMinutes && etaMinutes > 0 ? new Date(Date.now() + Math.round(etaMinutes) * 60_000).toISOString() : undefined
      return ride
    }),

  markDriverArrived: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      if (ride.status !== 'ACCEPTED') throw new Error('You can only say you are here on a confirmed ride.')
      ride.driverOnTheWayAt ??= now()
      ride.driverArrivedAt = now()
      return ride
    }),

  markPickedUp: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      requireStatus(ride, ['ACCEPTED'], cantChange(ride))
      ride.status = 'PICKED_UP'
      ride.pickedUpAt = now()
      return ride
    }),

  markCompleted: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      requireStatus(ride, ['PICKED_UP'], ride.status === 'ACCEPTED' ? 'Mark the client as picked up first.' : cantChange(ride))
      ride.status = 'COMPLETED'
      ride.completedAt = now()
      return ride
    }),

  markNoShow: (rideId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      requireStatus(ride, ['ACCEPTED'], cantChange(ride))
      ride.status = 'NO_SHOW'
      ride.cancelReason = 'Client did not show up. The ride is lost.'
      ride.cancelledAt = now()
      return ride
    }),

  undoDriverStep: (rideId, driverId) =>
    transact((db) => {
      const ride = findOrThrow(db.rides, rideId, 'Ride')
      if (ride.driverId !== driverId) throw new Error('This ride belongs to another driver.')
      const recent = (at?: string) => !!at && Date.now() - new Date(at).getTime() < UNDO_FINISH_MINUTES * 60_000
      switch (ride.status) {
        case 'COMPLETED':
          if (!recent(ride.completedAt)) throw new Error('This ride finished a while ago, so it can no longer be changed.')
          ride.status = 'PICKED_UP'
          ride.completedAt = undefined
          break
        case 'NO_SHOW':
          if (!recent(ride.cancelledAt)) throw new Error('This ride finished a while ago, so it can no longer be changed.')
          ride.status = 'ACCEPTED'
          ride.cancelReason = undefined
          ride.cancelledAt = undefined
          break
        case 'PICKED_UP':
          ride.status = 'ACCEPTED'
          ride.pickedUpAt = undefined
          break
        case 'ACCEPTED':
          if (ride.driverArrivedAt) ride.driverArrivedAt = undefined
          else if (ride.driverOnTheWayAt) {
            ride.driverOnTheWayAt = undefined
            ride.driverEta = undefined
          } else throw new Error("There's nothing to undo. To give up the ride, choose “I can't make it”.")
          break
        default:
          throw new Error(cantChange(ride))
      }
      return ride
    }),

  getImpact: () =>
    transact((db) => {
      const completed = db.rides.filter((r) => r.status === 'COMPLETED')
      return {
        ridesCompleted: completed.length,
        moneySaved: completed.reduce((sum, r) => sum + r.estimatedFareSaved, 0),
        // Deleting an account keeps its organization for history, so only count ones someone can still sign in to
        organizations: db.organizations.filter(
          (o) => o.status === 'APPROVED' && db.users.some((u) => u.orgId === o.id && (u.role === 'PARTNER' || u.role === 'ORG_ADMIN')),
        ).length,
        verifiedDrivers: db.drivers.filter((d) => d.status === 'APPROVED').length,
      }
    }),
}
