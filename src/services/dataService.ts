import type {
  Destination,
  Driver,
  Facility,
  Impact,
  Organization,
  Ride,
  RideOffer,
  User,
  VerificationStatus,
} from '../types'

// The contract every backend must follow (mock now, real backend later).
// Screens only talk to this interface, never to storage directly.
export interface DataService {
  // Users (demo role switcher)
  listUsers(): Promise<User[]>

  // Registration
  registerOrganization(org: Omit<Organization, 'id' | 'status'>): Promise<Organization>
  listOrganizations(): Promise<Organization[]>
  addFacility(facility: Omit<Facility, 'id'>): Promise<Facility>
  listFacilities(orgId?: string): Promise<Facility[]>
  registerDriver(
    user: Omit<User, 'id' | 'role'>,
    driver: Omit<Driver, 'id' | 'userId' | 'status' | 'available'>,
  ): Promise<Driver>
  listDrivers(): Promise<Driver[]>

  // Platform admin
  listPending(): Promise<{ orgs: Organization[]; drivers: Driver[] }>
  setOrgStatus(orgId: string, status: VerificationStatus): Promise<Organization>
  setDriverStatus(driverId: string, status: VerificationStatus): Promise<Driver>

  // Destinations
  listDestinations(city?: string): Promise<Destination[]>
  saveDestination(dest: Omit<Destination, 'id'>): Promise<Destination>

  // Rides: staff
  requestRide(ride: Omit<Ride, 'id' | 'status' | 'createdAt'>): Promise<Ride>
  getRide(rideId: string): Promise<Ride | undefined>
  listRidesForFacility(facilityId: string): Promise<Ride[]>
  listOffersForRide(rideId: string): Promise<RideOffer[]>
  retryRide(rideId: string): Promise<Ride>
  cancelRide(rideId: string, reason: string): Promise<Ride>

  // Drivers
  setAvailability(driverId: string, available: boolean): Promise<Driver>
  listMyOffers(driverId: string): Promise<RideOffer[]>
  listMyRides(driverId: string): Promise<Ride[]>
  respondToOffer(offerId: string, accept: boolean): Promise<Ride>
  dropRide(rideId: string, driverId: string): Promise<Ride>
  markPickedUp(rideId: string): Promise<Ride>
  markCompleted(rideId: string): Promise<Ride>

  // Impact
  getImpact(): Promise<Impact>
}
