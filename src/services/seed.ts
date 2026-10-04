import { ALL_DAY, hoursOn } from '../logic/requestHours'
import type { Destination, Driver, House, Organization, Ride, RideOffer, User } from '../types'

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

type SeedDestination = Omit<Destination, 'id' | 'orgId'> & { key: string }

// Common hospitals, saved for every demo partner
const HOSPITALS: SeedDestination[] = [
  { key: 'stp', name: "St. Paul's Hospital", address: '1081 Burrard St, Vancouver', city: 'Vancouver' },
  { key: 'vgh', name: 'Vancouver General Hospital', address: '899 W 12th Ave, Vancouver', city: 'Vancouver' },
  { key: 'rh', name: 'Richmond Hospital', address: '7000 Westminster Hwy, Richmond', city: 'Richmond' },
]

const THREE_BRIDGES: SeedDestination = { key: '3b', name: 'Three Bridges Community Health Centre', address: '1128 Hornby St, Vancouver', city: 'Vancouver' }
const RAVEN_SONG: SeedDestination = { key: 'raven', name: 'Raven Song Community Health Centre', address: '2450 Ontario St, Vancouver', city: 'Vancouver' }
const GROUNDSPRING: SeedDestination = {
  key: 'ground',
  name: "Groundspring Primary Care (Lily's Community Health Centre)",
  address: '38 W Hastings St, Vancouver',
  city: 'Vancouver',
}

// Places each house's case workers said they send clients most (see PARTNER_ORG_NOTES.md).
// General answers like "walk-in clinics" or "Service Canada" use the office nearest the house.
// The Genesis Program is left out: it's a recovery residence, so its address isn't listed.
const FREQUENT_PLACES: Record<string, SeedDestination[]> = {
  belkin: [
    THREE_BRIDGES,
    RAVEN_SONG,
    GROUNDSPRING,
    { key: 'aac', name: 'Access and Assessment Centre (VGH)', address: '803 W 12th Ave, Vancouver', city: 'Vancouver' },
    { key: 'reach', name: 'REACH Community Health Centre', address: '1145 Commercial Dr, Vancouver', city: 'Vancouver' },
    { key: 'gather', name: 'The Gathering Place', address: '609 Helmcken St, Vancouver', city: 'Vancouver' },
    { key: 'vpl', name: 'Vancouver Public Library, Central Branch', address: '350 W Georgia St, Vancouver', city: 'Vancouver' },
    { key: 'dewc', name: "Downtown Eastside Women's Centre", address: '302 Columbia St, Vancouver', city: 'Vancouver' },
  ],
  richmond: [
    { key: 'msdpr', name: 'MSDPR Richmond Office', address: '220-7577 Elmbridge Way, Richmond', city: 'Richmond' },
    { key: 'workbc', name: 'WorkBC Centre Richmond (No. 5 Road)', address: '1030-10820 No. 5 Rd, Richmond', city: 'Richmond' },
    { key: 'icbc', name: 'ICBC Driver Licensing, Lansdowne Centre', address: '402-5300 No. 3 Rd, Richmond', city: 'Richmond' },
    { key: 'upcc', name: 'Richmond City Centre Urgent & Primary Care', address: '110-4671 No. 3 Rd, Richmond', city: 'Richmond' },
    { key: 'vogel', name: 'Anne Vogel Clinic', address: '210-7671 Alderbridge Way, Richmond', city: 'Richmond' },
    { key: 'trans', name: 'VCH Transitions Program', address: '600-8100 Granville Ave, Richmond', city: 'Richmond' },
    { key: 'brig', name: 'Brighouse Drop-In Centre', address: '7840 Granville Ave, Richmond', city: 'Richmond' },
    { key: 'caring', name: 'Richmond Caring Place', address: '140-7000 Minoru Blvd, Richmond', city: 'Richmond' },
    { key: 'ironlib', name: 'Ironwood Library', address: '8200-11688 Steveston Hwy, Richmond', city: 'Richmond' },
    { key: 'thrive', name: 'Thrive Medical Clinic (walk-in)', address: '8060-11688 Steveston Hwy, Richmond', city: 'Richmond' },
  ],
  grace: [
    THREE_BRIDGES,
    RAVEN_SONG,
    GROUNDSPRING,
    { key: 'belkin', name: 'Belkin House', address: '555 Homer St, Vancouver', city: 'Vancouver' },
    { key: 'carn', name: 'Carnegie Community Centre', address: '401 Main St, Vancouver', city: 'Vancouver' },
    { key: 'kettle', name: 'The Kettle Society', address: '1725 Venables St, Vancouver', city: 'Vancouver' },
    { key: 'junc', name: 'Vancouver Junction', address: '1669 E Broadway, Vancouver', city: 'Vancouver' },
    { key: 'rcafe', name: 'Recovery Café', address: '620 Clark Dr, Vancouver', city: 'Vancouver' },
    { key: 'mposs', name: 'Mission Possible', address: '648 E Hastings St, Vancouver', city: 'Vancouver' },
    { key: 'south', name: 'South Hill Education Centre', address: '6010 Fraser St, Vancouver', city: 'Vancouver' },
    { key: 'vcc', name: 'Vancouver Community College, Downtown', address: '250 W Pender St, Vancouver', city: 'Vancouver' },
    { key: 'msdpr', name: 'MSDPR Vancouver Office (Dockside)', address: '180 Main St, Vancouver', city: 'Vancouver' },
    { key: 'svc', name: 'Service Canada Centre', address: '978 Granville St, Vancouver', city: 'Vancouver' },
  ],
}

const demoUsers: User[] = [
  { id: 'u-admin', name: 'CareRide Admin', email: 'admin@careride.demo', phone: '604-555-0100', role: 'PLATFORM_ADMIN' },
  { id: 'u-belkin', name: 'Belkin House', email: 'belkin@careride.demo', phone: '604-555-0120', role: 'PARTNER', orgId: 'org-belkin', houseId: 'house-belkin' },
  { id: 'u-richmond', name: 'Richmond House', email: 'richmond@careride.demo', phone: '604-555-0121', role: 'PARTNER', orgId: 'org-richmond', houseId: 'house-richmond' },
  { id: 'u-grace', name: 'Grace Mansion', email: 'grace@careride.demo', phone: '604-555-0122', role: 'PARTNER', orgId: 'org-grace', houseId: 'house-grace' },
  { id: 'u-vanshare-admin', name: 'Community Van Share Admin', email: 'vanshare@careride.demo', phone: '604-555-0110', role: 'ORG_ADMIN', orgId: 'org-vanshare' },
  { id: 'u-frank', name: 'Frank', email: 'frank@careride.demo', phone: '604-555-0103', role: 'DRIVER' },
  { id: 'u-olive', name: 'Maya', email: 'maya@careride.demo', phone: '604-555-0104', role: 'DRIVER' },
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
    return [...(FREQUENT_PLACES[id] ?? []), ...HOSPITALS].map(({ key, ...place }) => ({ ...place, id: `dest-${key}-${id}`, orgId: org.id }))
  }),
  // A few past trips so the impact counter and "most visited" list aren't empty
  rides: [
    pastRide('ride-past-1', 'dest-stp-belkin', "St. Paul's Hospital", '1081 Burrard St, Vancouver', '2026-09-28T16:30:00.000Z'),
    pastRide('ride-past-2', 'dest-stp-belkin', "St. Paul's Hospital", '1081 Burrard St, Vancouver', '2026-09-30T17:00:00.000Z'),
    pastRide('ride-past-3', 'dest-vgh-belkin', 'Vancouver General Hospital', '899 W 12th Ave, Vancouver', '2026-10-01T18:15:00.000Z'),
  ],
  offers: [],
}
