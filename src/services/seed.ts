import type { Availability, Destination, Driver, House, Organization, Ride, RideOffer, User } from '../types'

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

const EVERY_DAY: Availability = { days: [0, 1, 2, 3, 4, 5, 6], from: '07:00', to: '22:00' }
const WEEKDAYS: Availability = { days: [1, 2, 3, 4, 5], from: '09:00', to: '17:00' }

function pastRide(id: string, destinationId: string, name: string, address: string, date: string): Ride {
  return {
    id,
    type: 'SCHEDULED',
    orgId: 'org-sa',
    houseId: 'house-belkin',
    requestedBy: 'u-belkin',
    passengers: 1,
    purpose: 'MEDICAL',
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
    completedAt: date,
  }
}

const demoUsers: User[] = [
  { id: 'u-admin', name: 'CareRide Admin', email: 'admin@careride.demo', phone: '604-555-0100', role: 'PLATFORM_ADMIN' },
  { id: 'u-sa-admin', name: 'Salvation Army Admin', email: 'salvationarmy@careride.demo', phone: '604-555-0101', role: 'ORG_ADMIN', orgId: 'org-sa' },
  { id: 'u-belkin', name: 'Belkin House', email: 'belkin@careride.demo', phone: '604-555-0120', role: 'HOUSE', orgId: 'org-sa', houseId: 'house-belkin' },
  { id: 'u-richmond', name: 'Richmond House', email: 'richmond@careride.demo', phone: '604-555-0121', role: 'HOUSE', orgId: 'org-sa', houseId: 'house-richmond' },
  { id: 'u-grace', name: 'Grace Mansion', email: 'grace@careride.demo', phone: '604-555-0122', role: 'HOUSE', orgId: 'org-sa', houseId: 'house-grace' },
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
    {
      id: 'org-sa',
      name: 'The Salvation Army',
      type: 'PARTNER_ORG',
      contactName: 'Salvation Army Admin',
      contactPhone: '604-555-0101',
      status: 'APPROVED',
    },
    {
      id: 'org-vanshare',
      name: 'Community Van Share (Fictional)',
      type: 'TRANSPORT_PROVIDER',
      contactName: 'Community Van Share Admin',
      contactPhone: '604-555-0110',
      bookingNotifications: 'bookings@vanshare.example',
      status: 'APPROVED',
    },
    {
      id: 'org-example',
      name: 'Example Shelter Society (Fictional)',
      type: 'PARTNER_ORG',
      contactName: 'Pat',
      contactPhone: '604-555-0130',
      status: 'PENDING',
    },
  ],
  houses: [
    { id: 'house-belkin', orgId: 'org-sa', name: 'Belkin House', address: 'Address to confirm', city: 'Vancouver', phone: '604-555-0120' },
    { id: 'house-richmond', orgId: 'org-sa', name: 'Richmond House', address: 'Address to confirm', city: 'Richmond', phone: '604-555-0121' },
    { id: 'house-grace', orgId: 'org-sa', name: 'Grace Mansion', address: 'Address to confirm', city: 'Vancouver', phone: '604-555-0122' },
  ],
  drivers: [
    {
      id: 'd-frank',
      userId: 'u-frank',
      background: 'RIDESHARE',
      vehicle: 'Black SUV',
      wheelchairAccessible: false,
      seats: 3,
      serviceCities: ['Vancouver', 'Richmond'],
      availability: EVERY_DAY,
      minNoticeHours: 1,
      licenceFile: 'licence.pdf',
      proofFile: 'rideshare-permit.pdf',
      status: 'APPROVED',
      available: true,
    },
    {
      id: 'd-olive',
      userId: 'u-olive',
      background: 'TAXI',
      vehicle: 'White sedan',
      wheelchairAccessible: false,
      seats: 3,
      serviceCities: ['Vancouver', 'Richmond'],
      availability: EVERY_DAY,
      minNoticeHours: 1,
      licenceFile: 'licence.pdf',
      proofFile: 'taxi-permit.pdf',
      status: 'APPROVED',
      available: true,
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
      availability: WEEKDAYS,
      minNoticeHours: 24,
      licenceFile: 'licence.pdf',
      status: 'APPROVED',
      available: true,
    },
    {
      id: 'd-jordan',
      userId: 'u-jordan',
      background: 'TAXI',
      vehicle: 'Blue hatchback',
      wheelchairAccessible: false,
      seats: 3,
      serviceCities: ['Richmond'],
      availability: EVERY_DAY,
      minNoticeHours: 2,
      licenceFile: 'licence.pdf',
      proofFile: 'taxi-permit.pdf',
      status: 'PENDING',
      available: true,
    },
  ],
  destinations: [
    { id: 'dest-stp', orgId: 'org-sa', name: "St. Paul's Hospital", address: '1081 Burrard St, Vancouver', city: 'Vancouver' },
    { id: 'dest-vgh', orgId: 'org-sa', name: 'Vancouver General Hospital', address: '899 W 12th Ave, Vancouver', city: 'Vancouver' },
    { id: 'dest-rh', orgId: 'org-sa', name: 'Richmond Hospital', address: '7000 Westminster Hwy, Richmond', city: 'Richmond' },
  ],
  // A few past trips so the impact counter and "most visited" list aren't empty
  rides: [
    pastRide('ride-past-1', 'dest-stp', "St. Paul's Hospital", '1081 Burrard St, Vancouver', '2026-09-28T16:30:00.000Z'),
    pastRide('ride-past-2', 'dest-stp', "St. Paul's Hospital", '1081 Burrard St, Vancouver', '2026-09-30T17:00:00.000Z'),
    pastRide('ride-past-3', 'dest-vgh', 'Vancouver General Hospital', '899 W 12th Ave, Vancouver', '2026-10-01T18:15:00.000Z'),
  ],
  offers: [],
}
