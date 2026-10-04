import type {
  Destination,
  Driver,
  House,
  Impact,
  Organization,
  Ride,
  RideOffer,
  User,
  VerificationStatus,
} from '../types'

export type NewOrganization = Omit<Organization, 'id' | 'status'>
export interface NewAccount {
  name: string
  email: string
  password: string
}
// Outcome of self sign-up. With email confirmation on, the account exists but nobody is signed in yet.
export type Registration = { status: 'SIGNED_IN'; user: User } | { status: 'CONFIRM_EMAIL'; email: string }
// What an admin's password reset produced. The demo sets a password to share; the real backend emails a reset link.
export type PasswordReset = { kind: 'NEW_PASSWORD'; email: string; password: string } | { kind: 'EMAIL_SENT'; email: string }
export type NewDriverUser = Pick<User, 'name' | 'phone'>
export type NewDriver = Omit<Driver, 'id' | 'userId' | 'status'>
// A partner organization's one location: where its rides start
export type NewLocation = Pick<House, 'address' | 'city' | 'phone'>
// What drivers can change themselves from their settings page
export type DriverSettings = Pick<
  Driver,
  'requestHours' | 'vehicle' | 'seats' | 'wheelchairAccessible' | 'serviceCities'
>
export type NewRide = Omit<
  Ride,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'driverOnTheWayAt'
  | 'driverEta'
  | 'driverArrivedAt'
  | 'pickedUpAt'
  | 'completedAt'
  | 'droppedBy'
  | 'cancelledAt'
  | 'expired'
  | 'changedAt'
  | 'reconfirmDriverId'
>
// What the partner can change after booking. Changing when, where, or who sends the ride out to drivers again.
export type RideChanges = Pick<
  Ride,
  | 'type'
  | 'pickupTime'
  | 'passengers'
  | 'riderNames'
  | 'needsWheelchair'
  | 'needsAssistance'
  | 'pickupInstructions'
  | 'notes'
  | 'destinationId'
  | 'destinationName'
  | 'destinationAddress'
>

// The contract every backend must follow (mock now, real backend later).
// Screens only talk to this interface, never to storage directly.
export interface DataService {
  // Session. The backend decides who is signed in; screens never set it directly.
  restoreSession(): Promise<User | undefined> // the signed-in account, if any; throws if it can't be checked
  signIn(email: string, password: string): Promise<User> // starts a session; throws if they don't match
  signOut(): Promise<void>
  // Calls back when the session changes outside this screen (another tab, expiry, demo reset). Returns unsubscribe.
  onSessionChange(listener: () => void): () => void
  // Calls back when shared data this person can see changes elsewhere (live updates). Returns unsubscribe.
  onDataChange(listener: () => void): () => void
  // "Forgot password": emails a reset link if an account exists, without saying whether one does
  requestPasswordReset(email: string): Promise<void>
  // Sets a new password for the signed-in person, e.g. after opening a reset link
  updatePassword(newPassword: string): Promise<void>

  // Accounts
  listUsers(): Promise<User[]>
  isEmailAvailable(email: string): Promise<boolean>

  // Organizations. Registering also creates the sign-in account; everything starts PENDING.
  // A partner organization gives its location (and any first destinations) too: it gets one shared account that books from there.
  registerOrganization(
    org: NewOrganization,
    account: NewAccount,
    location?: NewLocation,
    destinations?: Pick<Destination, 'name' | 'address' | 'city'>[],
  ): Promise<Registration>
  listOrganizations(): Promise<Organization[]>

  // Locations (point A): one per partner organization
  listHouses(orgId?: string): Promise<House[]>

  // Drivers: self sign-up with a login, or added by a transport provider without one
  registerDriver(user: NewDriverUser, driver: NewDriver, login: Pick<NewAccount, 'email' | 'password'>): Promise<Registration>
  addOrgDriver(user: NewDriverUser, driver: NewDriver): Promise<Driver> // transport providers only; the backend uses the signed-in org
  listDrivers(orgId?: string): Promise<Driver[]>
  // Approved drivers' eligibility (seats, cities, hours) for booking previews, without saying who they are
  listDriverPool(): Promise<Driver[]>
  updateDriver(driverId: string, changes: Partial<DriverSettings>): Promise<Driver>

  // Platform admin
  listPending(): Promise<{ orgs: Organization[]; drivers: Driver[] }>
  setOrgStatus(orgId: string, status: VerificationStatus): Promise<Organization>
  setDriverStatus(driverId: string, status: VerificationStatus): Promise<Driver>
  listAccounts(): Promise<User[]> // users who can sign in
  // Helps someone who is locked out. Platform admins only.
  resetPassword(userId: string, newPassword?: string): Promise<PasswordReset>
  // Removes the account and its sign-in. A driver stops getting requests, and their upcoming rides
  // go back out to other drivers. Houses, organizations, and past rides stay.
  deleteAccount(userId: string): Promise<void>
  // The signed-in driver or partner organization closes their own sign-in. Ride history stays.
  // A driver with a client in the car has to finish that ride first.
  deleteMyAccount(): Promise<void>

  // Destinations (point B). Past rides keep the address they were booked with.
  listDestinations(orgId?: string): Promise<Destination[]>
  saveDestination(dest: Omit<Destination, 'id'>): Promise<Destination>
  updateDestination(id: string, changes: Pick<Destination, 'name' | 'address' | 'city' | 'notes'>): Promise<Destination>
  deleteDestination(id: string): Promise<void>

  // Rides: partner organization
  // Throws if a scheduled pickup time is in the past or the ride is too big. Send the same clientRequestId
  // when retrying one submission, so an answer lost on the network can't create a second booking.
  requestRide(ride: NewRide, clientRequestId?: string): Promise<Ride>
  updateRide(rideId: string, changes: RideChanges): Promise<Ride> // only before pickup
  getRide(rideId: string): Promise<Ride | undefined>
  listRidesForHouse(houseId: string): Promise<Ride[]>
  listOffersForRide(rideId: string): Promise<RideOffer[]>
  retryRide(rideId: string): Promise<Ride>
  cancelRide(rideId: string, reason: string): Promise<Ride>

  // Rides: drivers, and transport providers acting for their drivers
  listMyOffers(driverId: string): Promise<RideOffer[]>
  listOffersForOrg(orgId: string): Promise<RideOffer[]>
  listMyRides(driverId: string): Promise<Ride[]>
  listRidesForOrg(orgId: string): Promise<Ride[]> // rides taken by the org's drivers
  respondToOffer(offerId: string, accept: boolean): Promise<Ride>
  dropRide(rideId: string, driverId: string): Promise<Ride>
  markOnTheWay(rideId: string, etaMinutes?: number): Promise<Ride> // driver set off, with an optional ETA
  markDriverArrived(rideId: string): Promise<Ride> // driver is at the pickup ("I'm here")
  markPickedUp(rideId: string): Promise<Ride>
  markCompleted(rideId: string): Promise<Ride>
  markNoShow(rideId: string): Promise<Ride> // client passed up the ride and loses it
  undoDriverStep(rideId: string, driverId: string): Promise<Ride> // takes back the driver's last step

  // Impact
  getImpact(): Promise<Impact>
}
