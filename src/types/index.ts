// Shared types used by every screen and service.
// See PRODUCT_DESCRIPTION.md section 10.4.

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type OrgType = 'SOCIAL_SERVICE' | 'TRANSPORT_PROVIDER'

export interface Organization {
  id: string
  name: string
  type: OrgType
  contactName: string
  contactPhone: string
  status: VerificationStatus
}

export interface Facility {
  id: string
  orgId: string
  name: string
  address: string
  city: string
  phone: string
}

export type UserRole = 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'STAFF' | 'DRIVER'

export interface User {
  id: string
  name: string
  phone: string
  role: UserRole
  orgId?: string
  facilityId?: string // staff belong to a facility
}

export type DriverBackground = 'TAXI' | 'RIDESHARE' | 'INDEPENDENT' | 'PARTNER_ORG'

export interface Driver {
  id: string
  userId: string
  orgId?: string // set if driving for a transport organization
  background: DriverBackground
  vehicle: string
  wheelchairAccessible: boolean
  seats: number
  serviceCities: string[]
  licenceFile?: string // demo: file name only
  recordCheckFile?: string // demo: file name only
  status: VerificationStatus
  available: boolean // the "I'm available" switch
}

export interface Destination {
  id: string
  name: string
  address: string
  city: string
  notes?: string
}

export type RideType = 'ESSENTIAL' | 'SCHEDULED'

export type RideStatus =
  | 'SEARCHING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'NEEDS_ATTENTION'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED'

export interface Ride {
  id: string
  type: RideType
  orgId: string
  facilityId: string
  requestedBy: string // staff User id, the person responsible
  clientName: string // first name or initials only
  clientRef: string // internal reference, e.g. "C-104"
  clientPhone?: string
  pickupAddress: string
  destinationId?: string
  destinationAddress: string
  pickupTime: string // ISO date-time
  needsWheelchair: boolean
  needsAssistance: boolean
  notes?: string
  status: RideStatus
  driverId?: string // set once accepted
  returnOfRideId?: string // set on a return trip
  groupId?: string // set when combined with other rides
  cancelReason?: string
  estimatedFareSaved: number
  createdAt: string
}

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'

export interface RideOffer {
  id: string
  rideId: string
  driverId: string
  status: OfferStatus
  sentAt: string
  expiresAt: string
  respondedAt?: string
}

export interface Impact {
  ridesCompleted: number
  moneySaved: number
  organizations: number
  verifiedDrivers: number
}
