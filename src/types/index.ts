// Shared types used by every screen and service.
// See PRODUCT_DESCRIPTION.md section 10.4.

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// A partner org requests rides (and may also have its own vehicles).
// A transport provider only gives rides.
export type OrgType = 'PARTNER_ORG' | 'TRANSPORT_PROVIDER'

export interface Organization {
  id: string
  name: string
  type: OrgType
  contactName: string
  contactPhone: string
  bookingNotifications?: string // phone or email that hears about new bookings
  status: VerificationStatus
}

// Point A: a housing location where clients live, e.g. Belkin House.
// Each house has exactly one shared account.
export interface House {
  id: string
  orgId: string
  name: string
  address: string
  city: string
  phone: string
}

export type UserRole = 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'HOUSE' | 'DRIVER'

export interface User {
  id: string
  name: string
  email?: string // used to sign in
  phone: string
  role: UserRole
  orgId?: string
  houseId?: string // set on a house account
}

export type DriverBackground = 'TAXI' | 'RIDESHARE' | 'ORG_DRIVER' | 'INDEPENDENT'

// A stretch of one day. Can't cross midnight.
export interface TimeWindow {
  from: string // "HH:MM", 24-hour
  to: string // "HH:MM", 24-hour, same day
}

// When a driver is happy to be sent ride requests. It's not a promise to drive:
// they still choose which requests to accept. Seven entries, 0 = Sunday ... 6 = Saturday;
// null means no requests that day.
export type RequestHours = (TimeWindow | null)[]

export interface Driver {
  id: string
  userId: string
  orgId?: string // set if the driver belongs to an organization
  background: DriverBackground
  vehicle: string
  wheelchairAccessible: boolean
  seats: number // spaces for passengers
  serviceCities: string[]
  requestHours: RequestHours
  minNoticeHours: number // how far ahead a ride must be booked
  licenceFile?: string // demo: file name only
  proofFile?: string // demo: proof of professional driving, file name only
  status: VerificationStatus
  available: boolean // false = paused, gets no requests
}

// Point B: a place clients go, e.g. St. Paul's Hospital. Added by the partner org.
export interface Destination {
  id: string
  orgId: string
  name: string
  address: string
  city: string
  notes?: string
}

export type RideType = 'ON_DEMAND' | 'SCHEDULED'

export type TripPurpose = 'MEDICAL' | 'SOCIAL_SERVICES' | 'HOUSING' | 'LEGAL_OR_ID' | 'OTHER'

export type RideStatus =
  | 'SEARCHING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'NEEDS_ATTENTION'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED'

// A one-way trip. A return trip is a separate ride linked by returnOfRideId.
// No client information is stored: no name, phone, or history.
export interface Ride {
  id: string
  type: RideType
  orgId: string
  houseId: string
  requestedBy: string // house account User id
  clientName?: string
  passengers: number
  purpose: TripPurpose
  pickupAddress: string
  pickupInstructions?: string // e.g. "Meet in the front lobby"
  destinationId?: string // if a saved destination was used
  destinationName: string
  destinationAddress: string
  pickupTime: string // ISO date-time
  needsWheelchair: boolean
  needsAssistance: boolean
  notes?: string
  status: RideStatus
  driverId?: string // set once accepted
  preferredDriverId?: string // asked first, e.g. the driver of the outbound trip
  returnOfRideId?: string // set on a return trip
  groupId?: string // set when combined with other rides
  cancelReason?: string
  estimatedFareSaved: number
  createdAt: string
  completedAt?: string
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
