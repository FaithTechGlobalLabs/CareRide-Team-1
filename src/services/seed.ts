import { ALL_DAY, hoursOn } from '../logic/requestHours'
import type { Destination, Driver, House, Organization, Ride, RideOffer, User } from '../types'

// Demo data. Everything here is fictional except public place names.
// TODO: confirm real house addresses with the project owners.

// Demo only: the mock backend keeps passwords in plain text in the browser.
// A real backend must use a proper auth provider (e.g. Supabase Auth).
export interface Credential {
  email: string
  userId: string
  password: string
}

export const DEMO_PASSWORD = 'careride'
export const DEMO_EMAIL_DOMAIN = '@careride.demo'

export interface Database {
  credentials: Credential[]
  users: User[]
  organizations: Organization[]
  houses: House[]
  drivers: Driver[]
  destinations: Destination[]
  rides: Ride[]
  offers: RideOffer[]
}

// Frank takes requests any time so the demo always has someone to ask
const ANY_TIME = hoursOn([0, 1, 2, 3, 4, 5, 6], ALL_DAY)
const DAYS_AND_EVENINGS = hoursOn([0, 1, 2, 3, 4, 5, 6], { from: '07:00', to: '22:00' })
const WEEKDAYS = hoursOn([1, 2, 3, 4, 5], { from: '09:00', to: '17:00' })

function pastRide(id: string, destinationId: string, name: string, address: string, date: string): Ride {
  return {
    id,
    type: 'SCHEDULED',
    orgId: 'org-belkin',
    houseId: 'house-belkin',
    requestedBy: 'u-belkin',
    passengers: 1,
    pickupAddress: 'Belkin House (address to confirm)',
    destinationId,
    destinationName: name,
    destinationAddress: address,
    pickupTime: date,
    needsWheelchair: false,
    needsAssistance: false,
    status: 'COMPLETED',
    driverId: 'd-olive',
    estimatedFareSaved: 25,
    createdAt: date,
    acceptedAt: date,
    pickedUpAt: date,
    completedAt: date,
  }
}

// Each partner organization is one location with one shared account.
function partner(id: string, name: string, phone: string, city: string, status: Organization['status'] = 'APPROVED'): { org: Organization; house: House } {
  return {
    org: { id: `org-${id}`, name, type: 'PARTNER_ORG', contactName: name, contactPhone: phone, status },
    house: { id: `house-${id}`, orgId: `org-${id}`, name, address: 'Address to confirm', city, phone },
  }
}

const partners = [
  partner('belkin', 'Belkin House', '604-555-0120', 'Vancouver'),
  partner('richmond', 'Richmond House', '604-555-0121', 'Richmond'),
  partner('grace', 'Grace Mansion', '604-555-0122', 'Vancouver'),
  partner('example', 'Example Shelter Society (Fictional)', '604-555-0130', 'Vancouver', 'PENDING'),
]

// Common hospitals, saved for every demo partner
const HOSPITALS: Omit<Destination, 'id' | 'orgId'>[] = [
  { name: "St. Paul's Hospital", address: '1081 Burrard St, Vancouver', city: 'Vancouver' },
  { name: 'Vancouver General Hospital', address: '899 W 12th Ave, Vancouver', city: 'Vancouver' },
  { name: 'Richmond Hospital', address: '7000 Westminster Hwy, Richmond', city: 'Richmond' },
]
const HOSPITAL_KEYS = ['stp', 'vgh', 'rh']

const demoUsers: User[] = [
  { id: 'u-admin', name: 'CareRide Admin', email: 'admin@careride.demo', phone: '604-555-0100', role: 'PLATFORM_ADMIN' },
  { id: 'u-belkin', name: 'Belkin House', email: 'belkin@careride.demo', phone: '604-555-0120', role: 'PARTNER', orgId: 'org-belkin', houseId: 'house-belkin' },
  { id: 'u-richmond', name: 'Richmond House', email: 'richmond@careride.demo', phone: '604-555-0121', role: 'PARTNER', orgId: 'org-richmond', houseId: 'house-richmond' },
  { id: 'u-grace', name: 'Grace Mansion', email: 'grace@careride.demo', phone: '604-555-0122', role: 'PARTNER', orgId: 'org-grace', houseId: 'house-grace' },
  { id: 'u-vanshare-admin', name: 'Community Van Share Admin', email: 'vanshare@careride.demo', phone: '604-555-0110', role: 'ORG_ADMIN', orgId: 'org-vanshare' },
  { id: 'u-frank', name: 'Frank', email: 'frank@careride.demo', phone: '604-555-0103', role: 'DRIVER' },
  { id: 'u-olive', name: 'Olive', email: 'olive@careride.demo', phone: '604-555-0104', role: 'DRIVER' },
  { id: 'u-sam', name: 'Sam', email: 'sam@careride.demo', phone: '604-555-0105', role: 'DRIVER', orgId: 'org-vanshare' },
  { id: 'u-jordan', name: 'Jordan', email: 'jordan@careride.demo', phone: '604-555-0106', role: 'DRIVER' },
]

export const seed: Database = {
  credentials: demoUsers.map((u) => ({ email: u.email!, userId: u.id, password: DEMO_PASSWORD })),
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
      minNoticeHours: 1,
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
      minNoticeHours: 1,
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
      minNoticeHours: 24,
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
      minNoticeHours: 2,
      licenceFile: 'licence.pdf',
      proofFile: 'taxi-permit.pdf',
      status: 'PENDING',
    },
  ],
  destinations: partners.flatMap(({ org }) =>
    HOSPITALS.map((h, i) => ({ ...h, id: `dest-${HOSPITAL_KEYS[i]}-${org.id.slice(4)}`, orgId: org.id })),
  ),
  // A few past trips so the impact counter and "most visited" list aren't empty
  rides: [
    pastRide('ride-past-1', 'dest-stp-belkin', "St. Paul's Hospital", '1081 Burrard St, Vancouver', '2026-09-28T16:30:00.000Z'),
    pastRide('ride-past-2', 'dest-stp-belkin', "St. Paul's Hospital", '1081 Burrard St, Vancouver', '2026-09-30T17:00:00.000Z'),
    pastRide('ride-past-3', 'dest-vgh-belkin', 'Vancouver General Hospital', '899 W 12th Ave, Vancouver', '2026-10-01T18:15:00.000Z'),
  ],
  offers: [],
}
