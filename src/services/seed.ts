import type { Destination, Driver, Facility, Organization, Ride, RideOffer, User } from '../types'

// Demo data. Everything here is fictional except public place names.
// TODO: confirm real Salvation Army facility addresses with the project owners.

export interface Database {
  users: User[]
  organizations: Organization[]
  facilities: Facility[]
  drivers: Driver[]
  destinations: Destination[]
  rides: Ride[]
  offers: RideOffer[]
}

export const seed: Database = {
  users: [
    { id: 'u-admin', name: 'CareRide Admin', phone: '604-555-0100', role: 'PLATFORM_ADMIN' },
    { id: 'u-orgadmin', name: 'Org Admin (Demo)', phone: '604-555-0101', role: 'ORG_ADMIN', orgId: 'org-sa' },
    { id: 'u-staff-van', name: 'Vancouver Staff (Demo)', phone: '604-555-0102', role: 'STAFF', orgId: 'org-sa', facilityId: 'fac-van' },
    { id: 'u-staff-rich', name: 'Richmond Staff (Demo)', phone: '604-555-0103', role: 'STAFF', orgId: 'org-sa', facilityId: 'fac-rich' },
    { id: 'u-olive', name: 'Olive', phone: '604-555-0104', role: 'DRIVER' },
    { id: 'u-sam', name: 'Sam', phone: '604-555-0105', role: 'DRIVER' },
    { id: 'u-jordan', name: 'Jordan', phone: '604-555-0106', role: 'DRIVER' },
  ],
  organizations: [
    {
      id: 'org-sa',
      name: 'The Salvation Army',
      type: 'SOCIAL_SERVICE',
      contactName: 'Org Admin (Demo)',
      contactPhone: '604-555-0101',
      status: 'APPROVED',
    },
    {
      id: 'org-van-share',
      name: 'Community Van Share (Fictional)',
      type: 'TRANSPORT_PROVIDER',
      contactName: 'Pat',
      contactPhone: '604-555-0110',
      status: 'PENDING',
    },
  ],
  facilities: [
    { id: 'fac-van', orgId: 'org-sa', name: 'Vancouver Facility', address: 'Address to confirm', city: 'Vancouver', phone: '604-555-0120' },
    { id: 'fac-rich', orgId: 'org-sa', name: 'Richmond Facility', address: 'Address to confirm', city: 'Richmond', phone: '604-555-0121' },
  ],
  drivers: [
    {
      id: 'd-olive',
      userId: 'u-olive',
      background: 'TAXI',
      vehicle: 'White sedan',
      wheelchairAccessible: false,
      seats: 3,
      serviceCities: ['Vancouver', 'Richmond'],
      licenceFile: 'licence.pdf',
      recordCheckFile: 'record-check.pdf',
      status: 'APPROVED',
      available: true,
    },
    {
      id: 'd-sam',
      userId: 'u-sam',
      background: 'RIDESHARE',
      vehicle: 'Grey minivan',
      wheelchairAccessible: true,
      seats: 5,
      serviceCities: ['Vancouver'],
      licenceFile: 'licence.pdf',
      recordCheckFile: 'record-check.pdf',
      status: 'APPROVED',
      available: true,
    },
    {
      id: 'd-jordan',
      userId: 'u-jordan',
      background: 'INDEPENDENT',
      vehicle: 'Blue hatchback',
      wheelchairAccessible: false,
      seats: 3,
      serviceCities: ['Richmond'],
      licenceFile: 'licence.pdf',
      recordCheckFile: 'record-check.pdf',
      status: 'PENDING',
      available: false,
    },
  ],
  destinations: [
    { id: 'dest-vgh', name: 'Vancouver General Hospital', address: '899 W 12th Ave, Vancouver', city: 'Vancouver' },
    { id: 'dest-stp', name: "St. Paul's Hospital", address: '1081 Burrard St, Vancouver', city: 'Vancouver' },
    { id: 'dest-rh', name: 'Richmond Hospital', address: '7000 Westminster Hwy, Richmond', city: 'Richmond' },
  ],
  rides: [],
  offers: [],
}
