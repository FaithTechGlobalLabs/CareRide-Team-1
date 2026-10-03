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
export type NewDriverUser = Pick<User, 'name' | 'phone'>
export type NewDriver = Omit<Driver, 'id' | 'userId' | 'status' | 'available'>
// What drivers can change themselves from their settings page
export type DriverSettings = Pick<
  Driver,
  'available' | 'requestHours' | 'minNoticeHours' | 'vehicle' | 'seats' | 'wheelchairAccessible' | 'serviceCities'
>
export type NewRide = Omit<Ride, 'id' | 'status' | 'createdAt' | 'completedAt'>

// The contract every backend must follow (mock now, real backend later).
// Screens only talk to this interface, never to storage directly.
export interface DataService {
  // Accounts
  listUsers(): Promise<User[]>
  signIn(email: string, password: string): Promise<User> // throws if they don't match
  isEmailAvailable(email: string): Promise<boolean>

  // Organizations. Registering also creates the org admin account.
  registerOrganization(org: NewOrganization, admin: NewAccount): Promise<{ org: Organization; user: User }>
  listOrganizations(): Promise<Organization[]>

  // Houses (point A). Adding a house also creates its single shared account.
  // With a login email, that account can sign in using the returned temporary password.
  addHouse(house: Omit<House, 'id'>, loginEmail?: string): Promise<{ house: House; tempPassword?: string }>
  listHouses(orgId?: string): Promise<House[]>

  // Drivers: self sign-up (with a login), or added by an organization (set driver.orgId)
  registerDriver(
    user: NewDriverUser,
    driver: NewDriver,
    login?: Pick<NewAccount, 'email' | 'password'>,
  ): Promise<{ driver: Driver; user: User }>
  listDrivers(orgId?: string): Promise<Driver[]>
  updateDriver(driverId: string, changes: Partial<DriverSettings>): Promise<Driver>

  // Platform admin
  listPending(): Promise<{ orgs: Organization[]; drivers: Driver[] }>
  setOrgStatus(orgId: string, status: VerificationStatus): Promise<Organization>
  setDriverStatus(driverId: string, status: VerificationStatus): Promise<Driver>
  listAccounts(): Promise<User[]> // users who can sign in
  // Sets a new password, or a temporary one if none is given. Returns the login to share.
  // A real backend must check the caller is a platform admin.
  resetPassword(userId: string, newPassword?: string): Promise<{ email: string; password: string }>
  // Removes the account and its sign-in. A driver's profile goes too, and their upcoming rides
  // go back out to other drivers. Houses, organizations, and past rides stay.
  deleteAccount(userId: string): Promise<void>

  // Destinations (point B)
  listDestinations(orgId?: string): Promise<Destination[]>
  saveDestination(dest: Omit<Destination, 'id'>): Promise<Destination>

  // Rides: house account
  requestRide(ride: NewRide): Promise<Ride>
  getRide(rideId: string): Promise<Ride | undefined>
  listRidesForHouse(houseId: string): Promise<Ride[]>
  listRidesRequestedByOrg(orgId: string): Promise<Ride[]> // rides booked by a partner org's houses
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
  markPickedUp(rideId: string): Promise<Ride>
  markCompleted(rideId: string): Promise<Ride>
  markNoShow(rideId: string): Promise<Ride> // client passed up the ride and loses it

  // Impact
  getImpact(): Promise<Impact>
}
