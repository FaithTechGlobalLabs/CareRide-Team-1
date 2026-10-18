import { ALL_DAY, hoursOn } from '../logic/requestHours'
import { knownPlace } from '../logic/places'
import { backfillRideEvents } from '../logic/rideEvents'
import type { Destination, Driver, House, Organization, Ride, RideEvent, RideFeedback, RideOffer, User } from '../types'

// Demo data. Everything here is fictional except public place names and addresses.
// House addresses are from https://belkintsa.ca/services/overview.

// Demo only: the mock backend keeps passwords in plain text in the browser.
// A real backend must use a proper auth provider (e.g. Supabase Auth).
export interface Credential {
  email: string
  userId: string
  password: string
}

export const DEMO_PASSWORD = 'careride'
export const DEMO_EMAIL_DOMAIN = '@careride.demo'

// The CareRide Admin has its own login, separate from the shared demo password.
export const ADMIN_EMAIL = 'admin@careride.com'
export const ADMIN_PASSWORD = 'abcd1234'

export function demoPasswordFor(email: string): string {
  return email === ADMIN_EMAIL ? ADMIN_PASSWORD : DEMO_PASSWORD
}

export interface Database {
  credentials: Credential[]
  users: User[]
  organizations: Organization[]
  houses: House[]
  drivers: Driver[]
  destinations: Destination[]
  rides: Ride[]
  offers: RideOffer[]
  events: RideEvent[] // each ride's change history, oldest first
  feedback: RideFeedback[]
}

// History for rides that don't have any yet (the seed, or demo data saved before the log existed),
// worked out from the times stored on each ride.
export function backfilledEvents(db: Pick<Database, 'rides' | 'users' | 'drivers'>): RideEvent[] {
  return db.rides.flatMap((ride) =>
    backfillRideEvents(ride).map((e, i): RideEvent => {
      const userId =
        e.actor === 'REQUESTER' ? ride.requestedBy : e.actor === 'DRIVER' ? db.drivers.find((d) => d.id === ride.driverId)?.userId : undefined
      const actor = db.users.find((u) => u.id === userId)
      return {
        id: `event-${ride.id}-${i}`,
        rideId: ride.id,
        kind: e.kind,
        at: e.at,
        actorRole: actor?.role,
        actorName: actor?.name,
        detail: e.detail,
      }
    }),
  )
}

// Frank takes requests any time so the demo always has someone to ask
const ANY_TIME = hoursOn([0, 1, 2, 3, 4, 5, 6], ALL_DAY)
const DAYS_AND_EVENINGS = hoursOn([0, 1, 2, 3, 4, 5, 6], { from: '07:00', to: '22:00' })
const WEEKDAYS = hoursOn([1, 2, 3, 4, 5], { from: '09:00', to: '17:00' })

const BELKIN_ADDRESS = '555 Homer St'

function pastRide(id: string, destinationId: string, name: string, address: string, date: string): Ride {
  return {
    id,
    type: 'SCHEDULED',
    orgId: 'org-belkin',
    houseId: 'house-belkin',
    requestedBy: 'u-belkin',
    passengers: 1,
    pickupAddress: `${BELKIN_ADDRESS}, Vancouver`,
    destinationId,
    destinationName: name,
    destinationAddress: address,
    pickupTime: date,
    needsWheelchair: false,
    needsAssistance: false,
    status: 'COMPLETED',
    driverId: 'd-olive',
    estimatedFareSaved: 2.58,
    createdAt: date,
    acceptedAt: date,
    pickedUpAt: date,
    completedAt: date,
  }
}

// Each partner organization is one location with one shared account.
function partner(
  id: string,
  name: string,
  phone: string,
  address: string,
  city: string,
  status: Organization['status'] = 'APPROVED',
): { org: Organization; house: House } {
  return {
    org: { id: `org-${id}`, name, type: 'PARTNER_ORG', contactName: name, contactPhone: phone, status },
    house: { id: `house-${id}`, orgId: `org-${id}`, name, address, city, phone },
  }
}

const partners = [
  partner('belkin', 'Belkin House', '604-555-0120', BELKIN_ADDRESS, 'Vancouver'),
  partner('richmond', 'Richmond House', '604-555-0121', '12040 Horseshoe Way', 'Richmond'),
  partner('grace', 'Grace Mansion', '604-555-0122', '596 E Hastings St', 'Vancouver'),
  partner('example', 'Example Shelter Society (Fictional)', '604-555-0130', 'Address to confirm', 'Vancouver', 'PENDING'),
]

// Common hospitals, saved for every demo partner
const HOSPITALS = ['stp', 'vgh', 'rh']

// Places each house's case workers said they send clients most (see PARTNER_ORG_NOTES.md)
const FREQUENT_PLACES: Record<string, string[]> = {
  belkin: ['3b', 'raven', 'ground', 'aac', 'reach', 'gather', 'vpl', 'dewc'],
  richmond: ['msdpr-rmd', 'workbc', 'icbc', 'upcc', 'vogel', 'trans', 'brig', 'caring', 'ironlib', 'thrive'],
  grace: ['3b', 'raven', 'ground', 'belkin', 'carn', 'kettle', 'junc', 'rcafe', 'mposs', 'south', 'vcc', 'msdpr', 'svc'],
}

const demoUsers: User[] = [
  { id: 'u-admin', name: 'CareRide Admin', email: ADMIN_EMAIL, phone: '604-555-0100', role: 'PLATFORM_ADMIN' },
  { id: 'u-belkin', name: 'Belkin House', email: 'belkin@careride.demo', phone: '604-555-0120', role: 'PARTNER', orgId: 'org-belkin', houseId: 'house-belkin' },
  { id: 'u-richmond', name: 'Richmond House', email: 'richmond@careride.demo', phone: '604-555-0121', role: 'PARTNER', orgId: 'org-richmond', houseId: 'house-richmond' },
  { id: 'u-grace', name: 'Grace Mansion', email: 'grace@careride.demo', phone: '604-555-0122', role: 'PARTNER', orgId: 'org-grace', houseId: 'house-grace' },
  { id: 'u-vanshare-admin', name: 'Community Van Share Admin', email: 'vanshare@careride.demo', phone: '604-555-0110', role: 'ORG_ADMIN', orgId: 'org-vanshare' },
  { id: 'u-frank', name: 'Frank', email: 'frank@careride.demo', phone: '604-555-0103', role: 'DRIVER' },
  { id: 'u-olive', name: 'Maya', email: 'maya@careride.demo', phone: '604-555-0104', role: 'DRIVER' },
  { id: 'u-sam', name: 'Sam', email: 'sam@careride.demo', phone: '604-555-0105', role: 'DRIVER', orgId: 'org-vanshare' },
  { id: 'u-jordan', name: 'Jordan', email: 'jordan@careride.demo', phone: '604-555-0106', role: 'DRIVER' },
]

const seedBase: Omit<Database, 'events' | 'feedback'> = {
  credentials: demoUsers.map((u) => ({ email: u.email!, userId: u.id, password: demoPasswordFor(u.email!) })),
  users: demoUsers,
  organizations: [
    ...partners.map((p) => p.org),
    // Transport providers are hidden from sign-up for now. Kept so Sam's accessible van stays in the demo.
    {
      id: 'org-vanshare',
      name: 'Community Van Share (Fictional)',
      type: 'TRANSPORT_PROVIDER',
      contactName: 'Community Van Share Admin',
      contactPhone: '604-555-0110',
      bookingNotifications: 'bookings@vanshare.example',
      status: 'APPROVED',
    },
  ],
  houses: partners.map((p) => p.house),
  drivers: [
    {
      id: 'd-frank',
      userId: 'u-frank',
      background: 'RIDESHARE',
      vehicle: 'Black SUV',
      wheelchairAccessible: false,
      seats: 3,
      serviceCities: ['Vancouver', 'Richmond'],
      requestHours: ANY_TIME,
      licenceFile: 'licence.pdf',
      proofFile: 'rideshare-permit.pdf',
      status: 'APPROVED',
    },
    {
      id: 'd-olive',
      userId: 'u-olive',
      background: 'TAXI',
      vehicle: 'White sedan',
      wheelchairAccessible: false,
      seats: 3,
      serviceCities: ['Vancouver', 'Richmond'],
      requestHours: DAYS_AND_EVENINGS,
      licenceFile: 'licence.pdf',
      proofFile: 'taxi-permit.pdf',
      status: 'APPROVED',
    },
    {
      id: 'd-sam',
      userId: 'u-sam',
      orgId: 'org-vanshare',
      background: 'ORG_DRIVER',
      vehicle: 'Grey accessible van',
      wheelchairAccessible: true,
      seats: 6,
      serviceCities: ['Vancouver'],
      requestHours: WEEKDAYS,
      licenceFile: 'licence.pdf',
      status: 'APPROVED',
    },
    {
      id: 'd-jordan',
      userId: 'u-jordan',
      background: 'TAXI',
      vehicle: 'Blue hatchback',
      wheelchairAccessible: false,
      seats: 3,
      serviceCities: ['Richmond'],
      requestHours: DAYS_AND_EVENINGS,
      licenceFile: 'licence.pdf',
      proofFile: 'taxi-permit.pdf',
      status: 'PENDING',
    },
  ],
  destinations: partners.flatMap(({ org }) => {
    const id = org.id.slice(4)
    return [...(FREQUENT_PLACES[id] ?? []), ...HOSPITALS].map((key) => {
      const { name, address, city } = knownPlace(key)
      return { name, address, city, id: `dest-${key}-${id}`, orgId: org.id }
    })
  }),
  // A few past trips so the impact counter and "most visited" list aren't empty
  rides: [
    pastRide('ride-past-1', 'dest-stp-belkin', "St. Paul's Hospital", '1081 Burrard St, Vancouver', '2026-09-28T16:30:00.000Z'),
    pastRide('ride-past-2', 'dest-stp-belkin', "St. Paul's Hospital", '1081 Burrard St, Vancouver', '2026-09-30T17:00:00.000Z'),
    pastRide('ride-past-3', 'dest-vgh-belkin', 'Vancouver General Hospital', '899 W 12th Ave, Vancouver', '2026-10-01T18:15:00.000Z'),
  ],
  offers: [],
}

export const seed: Database = {
  ...seedBase,
  events: backfilledEvents(seedBase),
  // So the admin's account details show what feedback looks like
  feedback: [
    {
      id: 'feedback-past-1',
      rideId: 'ride-past-1',
      authorRole: 'PARTNER',
      orgId: 'org-belkin',
      driverId: 'd-olive',
      rating: 'UP',
      note: 'Maya waited in the lobby and helped with the walker.',
      at: '2026-09-28T18:00:00.000Z',
    },
  ],
}
