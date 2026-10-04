import { FunctionsHttpError, type AuthError, type PostgrestError, type User as AuthUser } from '@supabase/supabase-js'
import { MIN_PASSWORD_LENGTH } from '../constants'
import { isNative } from '../native/platform'
import type {
  Destination,
  Driver,
  DriverBackground,
  House,
  OfferStatus,
  Organization,
  OrgType,
  RequestHours,
  Ride,
  RideOffer,
  RideStatus,
  RideType,
  User,
  UserRole,
  VerificationStatus,
} from '../types'
import type { DataService, DriverSettings, NewDriver, NewDriverUser, Registration } from './dataService'
import { getSupabase } from './supabaseClient'

// Real backend. Identity comes from Supabase Auth; the CareRide profile is looked up from it.
// Methods not built yet fail loudly instead of falling back to the local mock (guide Step 10).

// ---------------------------------------------------------------------------
// Rows and mapping (database snake_case -> app camelCase)
// ---------------------------------------------------------------------------

// profiles.email is not readable from the browser (see the access-policies migration),
// so always list columns instead of select('*').
const PROFILE_COLUMNS = 'id, name, phone, role, org_id, house_id'
const ORG_COLUMNS = 'id, name, type, contact_name, contact_phone, booking_notifications, status'
const HOUSE_COLUMNS = 'id, org_id, name, address, city, phone'
const DRIVER_COLUMNS =
  'id, profile_id, org_id, background, vehicle, wheelchair_accessible, seats, service_cities, request_hours, min_notice_hours, status'
const DESTINATION_COLUMNS = 'id, org_id, name, address, city, notes'
const RIDE_COLUMNS = [
  'id, type, org_id, house_id, requested_by, rider_names, passengers, pickup_address, pickup_instructions',
  'destination_id, destination_name, destination_address, pickup_time, needs_wheelchair, needs_assistance, notes',
  'status, driver_id, preferred_driver_id, reconfirm_driver_id, return_of_ride_id, cancel_reason, expired',
  'estimated_fare_saved, dropped_by_driver_id, dropped_at, created_at, accepted_at, driver_on_the_way_at',
  'driver_eta, driver_arrived_at, picked_up_at, completed_at, cancelled_at, changed_at',
].join(', ')
const OFFER_COLUMNS = 'id, ride_id, driver_id, status, sent_at, expires_at, responded_at'

interface ProfileRow {
  id: string
  name: string
  phone: string | null
  role: UserRole
  org_id: string | null
  house_id: string | null
}

interface OrgRow {
  id: string
  name: string
  type: OrgType
  contact_name: string
  contact_phone: string
  booking_notifications: string | null
  status: VerificationStatus
}

interface HouseRow {
  id: string
  org_id: string
  name: string
  address: string
  city: string
  phone: string
}

interface DriverRow {
  id: string
  profile_id: string
  org_id: string | null
  background: DriverBackground
  vehicle: string
  wheelchair_accessible: boolean
  seats: number
  service_cities: string[]
  request_hours: RequestHours
  min_notice_hours: number
  status: VerificationStatus
}

interface DestinationRow {
  id: string
  org_id: string
  name: string
  address: string
  city: string
  notes: string | null
}

interface RideRow {
  id: string
  type: RideType
  org_id: string
  house_id: string
  requested_by: string
  rider_names: string[] | null
  passengers: number
  pickup_address: string
  pickup_instructions: string | null
  destination_id: string | null
  destination_name: string
  destination_address: string
  pickup_time: string
  needs_wheelchair: boolean
  needs_assistance: boolean
  notes: string | null
  status: RideStatus
  driver_id: string | null
  preferred_driver_id: string | null
  reconfirm_driver_id: string | null
  return_of_ride_id: string | null
  cancel_reason: string | null
  expired: boolean
  estimated_fare_saved: number | string
  dropped_by_driver_id: string | null
  dropped_at: string | null
  created_at: string
  accepted_at: string | null
  driver_on_the_way_at: string | null
  driver_eta: string | null
  driver_arrived_at: string | null
  picked_up_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  changed_at: string | null
}

interface OfferRow {
  id: string
  ride_id: string
  driver_id: string
  status: OfferStatus
  sent_at: string
  expires_at: string
  responded_at: string | null
}

// Postgres returns "2026-10-03 12:00:00+00"-style times; the app compares ISO strings like the mock's.
function iso(value: string): string
function iso(value: string | null): string | undefined
function iso(value: string | null): string | undefined {
  return value ? new Date(value).toISOString() : undefined
}

function toUser(row: ProfileRow, email?: string): User {
  return {
    id: row.id,
    name: row.name,
    email,
    phone: row.phone ?? '',
    role: row.role,
    orgId: row.org_id ?? undefined,
    houseId: row.house_id ?? undefined,
  }
}

function toOrganization(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    bookingNotifications: row.booking_notifications ?? undefined,
    status: row.status,
  }
}

function toHouse(row: HouseRow): House {
  return { id: row.id, orgId: row.org_id, name: row.name, address: row.address, city: row.city, phone: row.phone }
}

// Documents are uploaded separately (guide Step 13), so licenceFile/proofFile stay empty for now.
function toDriver(row: DriverRow): Driver {
  return {
    id: row.id,
    userId: row.profile_id,
    orgId: row.org_id ?? undefined,
    background: row.background,
    vehicle: row.vehicle,
    wheelchairAccessible: row.wheelchair_accessible,
    seats: row.seats,
    serviceCities: row.service_cities,
    requestHours: row.request_hours,
    minNoticeHours: row.min_notice_hours,
    status: row.status,
  }
}

function toDestination(row: DestinationRow): Destination {
  return { id: row.id, orgId: row.org_id, name: row.name, address: row.address, city: row.city, notes: row.notes ?? undefined }
}

function toRide(row: RideRow): Ride {
  return {
    id: row.id,
    type: row.type,
    orgId: row.org_id,
    houseId: row.house_id,
    requestedBy: row.requested_by,
    riderNames: row.rider_names ?? undefined,
    passengers: row.passengers,
    pickupAddress: row.pickup_address,
    pickupInstructions: row.pickup_instructions ?? undefined,
    destinationId: row.destination_id ?? undefined,
    destinationName: row.destination_name,
    destinationAddress: row.destination_address,
    pickupTime: iso(row.pickup_time),
    needsWheelchair: row.needs_wheelchair,
    needsAssistance: row.needs_assistance,
    notes: row.notes ?? undefined,
    status: row.status,
    driverId: row.driver_id ?? undefined,
    preferredDriverId: row.preferred_driver_id ?? undefined,
    reconfirmDriverId: row.reconfirm_driver_id ?? undefined,
    returnOfRideId: row.return_of_ride_id ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    expired: row.expired || undefined,
    estimatedFareSaved: Number(row.estimated_fare_saved),
    droppedBy: row.dropped_by_driver_id && row.dropped_at ? { driverId: row.dropped_by_driver_id, at: iso(row.dropped_at) } : undefined,
    createdAt: iso(row.created_at),
    acceptedAt: iso(row.accepted_at),
    driverOnTheWayAt: iso(row.driver_on_the_way_at),
    driverEta: iso(row.driver_eta),
    driverArrivedAt: iso(row.driver_arrived_at),
    pickedUpAt: iso(row.picked_up_at),
    completedAt: iso(row.completed_at),
    cancelledAt: iso(row.cancelled_at),
    changedAt: iso(row.changed_at),
  }
}

function toOffer(row: OfferRow): RideOffer {
  return {
    id: row.id,
    rideId: row.ride_id,
    driverId: row.driver_id,
    status: row.status,
    sentAt: iso(row.sent_at),
    expiresAt: iso(row.expires_at),
    respondedAt: iso(row.responded_at),
  }
}

// The only driver columns the browser may change (matches the column grant in the policies migration).
const DRIVER_SETTING_COLUMNS: Record<keyof DriverSettings, string> = {
  vehicle: 'vehicle',
  seats: 'seats',
  wheelchairAccessible: 'wheelchair_accessible',
  serviceCities: 'service_cities',
  requestHours: 'request_hours',
  minNoticeHours: 'min_notice_hours',
}

// What the database functions read when building a driver (see private.insert_driver).
function driverDetails(user: NewDriverUser, driver: NewDriver) {
  return {
    name: user.name,
    phone: user.phone,
    background: driver.background,
    vehicle: driver.vehicle,
    seats: driver.seats,
    wheelchairAccessible: driver.wheelchairAccessible,
    serviceCities: driver.serviceCities,
    requestHours: driver.requestHours,
    minNoticeHours: driver.minNoticeHours,
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const CONNECTION = 'Check your connection and try again.'

// Our database functions raise P0001 with a message written for people; anything else gets the fallback.
function fail(error: PostgrestError, fallback: string): never {
  throw new Error(error.code === 'P0001' ? error.message : `${fallback} ${CONNECTION}`)
}

function ridesQuery() {
  return getSupabase().from('rides').select(RIDE_COLUMNS)
}

async function readRides(query: PromiseLike<{ data: RideRow[] | null; error: PostgrestError | null }>): Promise<Ride[]> {
  const { data, error } = await query
  if (error) fail(error, "We couldn't load rides.")
  return (data ?? []).map(toRide)
}

function signInMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return "That email and password don't match. Please try again."
    case 'email_not_confirmed':
      return 'Please confirm your email first. Check your inbox for the link we sent.'
    default:
      return `We couldn't sign you in right now. ${CONNECTION}`
  }
}

const EMAIL_TAKEN = 'An account with this email already exists. Try signing in instead.'

function signUpMessage(error: AuthError): string {
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return EMAIL_TAKEN
    case 'weak_password':
      return 'Please choose a stronger password.'
    case 'email_address_invalid':
      return "That email address can't be used. Please check it."
    // Supabase's built-in test mailer only sends to the project team. Needs real email (SMTP) set up for everyone else.
    case 'email_address_not_authorized':
      return "We can't send a confirmation email to that address yet. Please contact CareRide."
    case 'over_email_send_rate_limit':
      return 'Too many sign-up emails were sent recently. Please wait a while and try again.'
    case 'signup_disabled':
      return "New sign-ups are turned off right now. Please contact CareRide."
    default:
      return `We couldn't create your account. ${CONNECTION}`
  }
}

// ---------------------------------------------------------------------------
// Session and onboarding
// ---------------------------------------------------------------------------

const ACCOUNT_UNAVAILABLE =
  "This login doesn't have an active CareRide account. If you think this is a mistake, contact CareRide."

async function queryProfile(authUserId: string): Promise<ProfileRow | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('auth_user_id', authUserId)
    .maybeSingle<ProfileRow>()
  if (error) fail(error, "We couldn't load your CareRide account.")
  return data
}

// The CareRide profile for a login. If sign-up was interrupted (or waited for the email link),
// finish it here from the details saved at sign-up. Safe to repeat.
async function loadProfile(authUser: AuthUser): Promise<User> {
  let row = await queryProfile(authUser.id)
  if (!row && authUser.user_metadata?.careride_onboarding) {
    const { error } = await getSupabase().rpc('complete_onboarding')
    if (error) fail(error, "We couldn't finish setting up your account.")
    row = await queryProfile(authUser.id)
  }
  if (!row) {
    // No profile and nothing to build one from, or a deactivated account. Don't leave a half-signed-in session.
    await getSupabase().auth.signOut({ scope: 'local' })
    throw new Error(ACCOUNT_UNAVAILABLE)
  }
  return toUser(row, authUser.email)
}

// Create the login with the form details attached. complete_onboarding() turns them into records.
async function signUp(email: string, password: string, details: Record<string, unknown>): Promise<Registration> {
  // Without a site address (an app build missing it), Supabase falls back to its Site URL setting
  const site = siteUrl()
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { careride_onboarding: details },
      emailRedirectTo: site ? `${site}/signin` : undefined,
    },
  })
  if (error) throw new Error(signUpMessage(error))
  // With email confirmation on, Auth hides whether an email is taken by returning a user with no identities.
  if (data.user && data.user.identities?.length === 0) throw new Error(EMAIL_TAKEN)
  if (!data.session || !data.user) return { status: 'CONFIRM_EMAIL', email: email.trim() }
  return { status: 'SIGNED_IN', user: await loadProfile(data.user) }
}

// Every ride change goes through a database function that locks the ride and returns its new state.
async function rideCall(fn: string, args: Record<string, unknown>, fallback: string): Promise<Ride> {
  const { data, error } = await getSupabase().rpc(fn, args)
  if (error) fail(error, fallback)
  return toRide(data as RideRow)
}

// The ride fields a partner sends; the database derives the rest (org, location, requester, fare, status, times).
function rideDetails(ride: Partial<Ride>) {
  return {
    type: ride.type,
    pickupTime: ride.pickupTime,
    passengers: ride.passengers,
    riderNames: ride.riderNames ?? [],
    needsWheelchair: ride.needsWheelchair,
    needsAssistance: ride.needsAssistance,
    pickupInstructions: ride.pickupInstructions ?? null,
    notes: ride.notes ?? null,
    destinationId: ride.destinationId ?? null,
    destinationName: ride.destinationName,
    destinationAddress: ride.destinationAddress,
  }
}

// Tables whose changes should refresh open screens. Realtime only sends rows this person may read.
const LIVE_TABLES = ['rides', 'ride_offers', 'organizations', 'drivers', 'destinations', 'profiles']

// The website that email links (confirm, reset password) open. On the website that's wherever the person is,
// so localhost and the live site both work. The Android app's own address is https://localhost, which a
// link can't open, so app builds use VITE_PUBLIC_SITE_URL instead. Each address must be allowed under
// Supabase Auth > URL Configuration > Redirect URLs.
function siteUrl(): string | undefined {
  if (!isNative) return window.location.origin
  return import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || undefined
}

function resetPasswordUrl(): string {
  const site = siteUrl()
  if (!site) throw new Error("This app can't send reset links yet. Reset your password on the CareRide website instead.")
  return `${site}/reset-password`
}

function passwordMessage(error: AuthError): string {
  switch (error.code) {
    case 'weak_password':
      return 'Please choose a stronger password.'
    case 'same_password':
      return 'Choose a password you haven’t used for this account before.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many reset emails were sent recently. Please wait a while and try again.'
    case 'email_address_not_authorized':
      return "We can't send email to that address yet. Please contact CareRide."
    default:
      return `That didn't work. ${CONNECTION}`
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const supabaseService: DataService = {
  async restoreSession() {
    const { data, error } = await getSupabase().auth.getSession()
    if (error) throw new Error(`We couldn't check your sign-in. ${CONNECTION}`)
    return data.session ? loadProfile(data.session.user) : undefined
  },

  async signIn(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(signInMessage(error))
    return loadProfile(data.user)
  },

  async signOut() {
    // 'local' signs out this browser only, not the person's other devices.
    const { error } = await getSupabase().auth.signOut({ scope: 'local' })
    if (error) throw new Error("We couldn't sign you out. Please try again.")
  },

  onSessionChange(listener) {
    let lastUserId: string | undefined
    // Keep this callback light: no awaiting other Auth calls inside it. The app reloads the profile itself.
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id
      if (event === 'INITIAL_SESSION') {
        lastUserId = userId // restoreSession already handled the starting session
        return
      }
      // Token refreshes keep the same person; only a different (or no) person needs a reload.
      if (userId === lastUserId) return
      lastUserId = userId
      setTimeout(listener, 0)
    })
    return () => data.subscription.unsubscribe()
  },

  onDataChange(listener) {
    const supabase = getSupabase()
    let connectedBefore = false
    // A unique name, so React's double effects in development never share a channel
    const channel = supabase.channel(`careride-changes-${crypto.randomUUID()}`)
    for (const table of LIVE_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => listener())
    }
    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      // Reconnected after a drop: reload in case something changed while we weren't listening
      if (connectedBefore) listener()
      connectedBefore = true
    })
    return () => {
      void supabase.removeChannel(channel)
    }
  },

  // Always looks the same whether or not the email has an account, so nobody can probe who uses CareRide.
  async requestPasswordReset(email) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: resetPasswordUrl() })
    if (error && error.code !== 'user_not_found') throw new Error(passwordMessage(error))
  },

  async updatePassword(newPassword) {
    if (newPassword.length < MIN_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    const { error } = await getSupabase().auth.updateUser({ password: newPassword })
    if (error) throw new Error(passwordMessage(error))
  },

  // Only the profiles this caller may see (access rules decide). Emails are never included.
  async listUsers() {
    const { data, error } = await getSupabase().from('profiles').select(PROFILE_COLUMNS).order('name').returns<ProfileRow[]>()
    if (error) fail(error, "We couldn't load accounts.")
    return data.map((row) => toUser(row))
  },

  // Auth reports a taken email at sign-up; a public "is this email registered?" check would leak who uses CareRide.
  isEmailAvailable: () => Promise.resolve(true),

  registerOrganization(org, account, location, destinations = []) {
    if (org.type !== 'PARTNER_ORG') {
      return Promise.reject(new Error('Only partner organizations can register right now.'))
    }
    if (!location) return Promise.reject(new Error('Add the address where rides start.'))
    return signUp(account.email, account.password, {
      role: 'PARTNER',
      orgName: org.name,
      contactName: org.contactName,
      contactPhone: org.contactPhone,
      address: location.address,
      city: location.city,
      destinations: destinations.map(({ name, address, city }) => ({ name, address, city })),
    })
  },

  async listOrganizations() {
    const { data, error } = await getSupabase().from('organizations').select(ORG_COLUMNS).order('name').returns<OrgRow[]>()
    if (error) fail(error, "We couldn't load organizations.")
    return data.map(toOrganization)
  },

  async listHouses(orgId) {
    let query = getSupabase().from('houses').select(HOUSE_COLUMNS).order('name')
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query.returns<HouseRow[]>()
    if (error) fail(error, "We couldn't load locations.")
    return data.map(toHouse)
  },

  registerDriver(user, driver, login) {
    return signUp(login.email, login.password, { role: 'DRIVER', ...driverDetails(user, driver) })
  },

  async addOrgDriver(user, driver) {
    const supabase = getSupabase()
    const { data: driverId, error } = await supabase.rpc('add_org_driver', { p_details: driverDetails(user, driver) })
    if (error) fail(error, "We couldn't add this driver.")
    const { data, error: readError } = await supabase.from('drivers').select(DRIVER_COLUMNS).eq('id', driverId).single<DriverRow>()
    if (readError) fail(readError, 'The driver was added, but we couldn’t load them.')
    return toDriver(data)
  },

  // Anonymous rows: the preview only needs to know what kinds of drivers exist, not who they are.
  async listDriverPool() {
    const { data, error } = await getSupabase().rpc('booking_driver_pool')
    if (error) fail(error, "We couldn't check which drivers are available.")
    type PoolRow = Pick<DriverRow, 'seats' | 'wheelchair_accessible' | 'service_cities' | 'request_hours' | 'min_notice_hours'>
    return (data as PoolRow[]).map((row, i) =>
      toDriver({ ...row, id: `pool-${i}`, profile_id: '', org_id: null, background: 'INDEPENDENT', vehicle: '', status: 'APPROVED' }),
    )
  },

  async listDrivers(orgId) {
    let query = getSupabase().from('drivers').select(DRIVER_COLUMNS).order('created_at')
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query.returns<DriverRow[]>()
    if (error) fail(error, "We couldn't load drivers.")
    return data.map(toDriver)
  },

  async updateDriver(driverId, changes) {
    const patch: Record<string, unknown> = {}
    for (const [key, column] of Object.entries(DRIVER_SETTING_COLUMNS)) {
      const value = changes[key as keyof DriverSettings]
      if (value !== undefined) patch[column] = value
    }
    const { data, error } = await getSupabase()
      .from('drivers')
      .update(patch)
      .eq('id', driverId)
      .select(DRIVER_COLUMNS)
      .maybeSingle<DriverRow>()
    if (error) {
      // 23514: a table check failed (seats, cities, vehicle). Request-hour problems arrive as P0001 with their own message.
      if (error.code === '23514') throw new Error('Please check your settings and try again.')
      fail(error, "We couldn't save your settings.")
    }
    if (!data) throw new Error('You can only change your own driver settings.')
    return toDriver(data)
  },

  async listPending() {
    const supabase = getSupabase()
    const [orgs, drivers] = await Promise.all([
      supabase.from('organizations').select(ORG_COLUMNS).eq('status', 'PENDING').order('created_at').returns<OrgRow[]>(),
      supabase.from('drivers').select(DRIVER_COLUMNS).eq('status', 'PENDING').order('created_at').returns<DriverRow[]>(),
    ])
    if (orgs.error) fail(orgs.error, "We couldn't load organizations waiting for review.")
    if (drivers.error) fail(drivers.error, "We couldn't load drivers waiting for review.")
    return { orgs: orgs.data.map(toOrganization), drivers: drivers.data.map(toDriver) }
  },

  async setOrgStatus(orgId, status) {
    const supabase = getSupabase()
    const { error } = await supabase.rpc('review_organization', { p_org_id: orgId, p_status: status })
    if (error) fail(error, "We couldn't save that review.")
    const { data, error: readError } = await supabase.from('organizations').select(ORG_COLUMNS).eq('id', orgId).single<OrgRow>()
    if (readError) fail(readError, 'The review was saved, but we couldn’t reload the organization.')
    return toOrganization(data)
  },

  async setDriverStatus(driverId, status) {
    const supabase = getSupabase()
    const { error } = await supabase.rpc('review_driver', { p_driver_id: driverId, p_status: status })
    if (error) fail(error, "We couldn't save that review.")
    const { data, error: readError } = await supabase.from('drivers').select(DRIVER_COLUMNS).eq('id', driverId).single<DriverRow>()
    if (readError) fail(readError, 'The review was saved, but we couldn’t reload the driver.')
    return toDriver(data)
  },

  // Admin only (checked in the database). Includes login emails, which no other read exposes.
  async listAccounts() {
    const { data, error } = await getSupabase().rpc('admin_list_accounts')
    if (error) fail(error, "We couldn't load accounts.")
    return (data as (ProfileRow & { email: string | null })[]).map((row) => toUser(row, row.email ?? undefined))
  },

  // Emails the person a link to choose a new password. Nobody else ever sees or sets it.
  async resetPassword(userId) {
    const accounts = await supabaseService.listAccounts() // admin-only, checked by the database
    const email = accounts.find((u) => u.id === userId)?.email
    if (!email) throw new Error("This account doesn't have a sign-in.")
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: resetPasswordUrl() })
    if (error) throw new Error(passwordMessage(error))
    return { kind: 'EMAIL_SENT', email }
  },

  // Server-side: the admin-delete-account Edge Function switches the account off, then removes the login.
  async deleteAccount(userId) {
    const { error } = await getSupabase().functions.invoke('admin-delete-account', { body: { profileId: userId } })
    if (!error) return
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? "We couldn't remove this account. Please try again.")
    }
    throw new Error(`We couldn't remove this account. ${CONNECTION}`)
  },

  async listDestinations(orgId) {
    let query = getSupabase().from('destinations').select(DESTINATION_COLUMNS).order('name')
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query.returns<DestinationRow[]>()
    if (error) fail(error, "We couldn't load saved destinations.")
    return data.map(toDestination)
  },

  async saveDestination(dest) {
    const { data, error } = await getSupabase()
      .from('destinations')
      .insert({ org_id: dest.orgId, name: dest.name.trim(), address: dest.address.trim(), city: dest.city, notes: dest.notes?.trim() || null })
      .select(DESTINATION_COLUMNS)
      .single<DestinationRow>()
    // 42501: the access rules refused it (not this org's partner account)
    if (error) throw new Error(error.code === '42501' ? 'Only your organization can add its destinations.' : `We couldn't save this destination. ${CONNECTION}`)
    return toDestination(data)
  },

  requestRide: (ride, clientRequestId) =>
    rideCall(
      'request_ride',
      { p_ride: { ...rideDetails(ride), returnOfRideId: ride.returnOfRideId ?? null }, p_client_request_id: clientRequestId ?? null },
      "We couldn't book this ride.",
    ),

  updateRide: (rideId, changes) =>
    rideCall('update_ride', { p_ride_id: rideId, p_changes: rideDetails(changes) }, "We couldn't save your changes."),

  async getRide(rideId) {
    const { data, error } = await ridesQuery().eq('id', rideId).maybeSingle<RideRow>()
    if (error) fail(error, "We couldn't load this ride.")
    return data ? toRide(data) : undefined
  },

  listRidesForHouse: (houseId) => readRides(ridesQuery().eq('house_id', houseId).order('pickup_time').returns<RideRow[]>()),

  async listOffersForRide(rideId) {
    const { data, error } = await getSupabase().from('ride_offers').select(OFFER_COLUMNS).eq('ride_id', rideId).order('sent_at').returns<OfferRow[]>()
    if (error) fail(error, "We couldn't load this ride's requests.")
    return data.map(toOffer)
  },

  retryRide: (rideId) => rideCall('retry_ride', { p_ride_id: rideId }, "We couldn't ask drivers again."),

  cancelRide: (rideId, reason) => rideCall('cancel_ride', { p_ride_id: rideId, p_reason: reason }, "We couldn't cancel this ride."),

  // Requests still waiting for an answer. Expired ones are hidden even before the expiry job (Step 12) marks them.
  async listMyOffers(driverId) {
    const { data, error } = await getSupabase()
      .from('ride_offers')
      .select(OFFER_COLUMNS)
      .eq('driver_id', driverId)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('sent_at')
      .returns<OfferRow[]>()
    if (error) fail(error, "We couldn't load your ride requests.")
    return data.map(toOffer)
  },

  // Waiting requests sent to any of this transport provider's drivers.
  async listOffersForOrg(orgId) {
    const { data, error } = await getSupabase()
      .from('ride_offers')
      .select(`${OFFER_COLUMNS}, drivers!inner(org_id)`)
      .eq('drivers.org_id', orgId)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('sent_at')
      .returns<OfferRow[]>()
    if (error) fail(error, "We couldn't load your drivers' ride requests.")
    return data.map(toOffer)
  },

  listMyRides: (driverId) => readRides(ridesQuery().eq('driver_id', driverId).order('pickup_time').returns<RideRow[]>()),

  // Rides taken by this organization's drivers.
  listRidesForOrg: (orgId) =>
    readRides(
      getSupabase()
        .from('rides')
        .select(`${RIDE_COLUMNS}, drivers!rides_driver_id_fkey!inner(org_id)`)
        .eq('drivers.org_id', orgId)
        .order('pickup_time')
        .returns<RideRow[]>(),
    ),

  respondToOffer: (offerId, accept) =>
    rideCall('respond_to_offer', { p_offer_id: offerId, p_accept: accept }, "We couldn't send your answer."),

  dropRide: (rideId, driverId) =>
    rideCall('drop_ride', { p_ride_id: rideId, p_driver_id: driverId }, "We couldn't give up this ride."),

  markOnTheWay: (rideId, etaMinutes) =>
    rideCall('advance_ride', { p_ride_id: rideId, p_step: 'ON_THE_WAY', p_eta_minutes: etaMinutes ?? null }, "We couldn't update this ride."),
  markDriverArrived: (rideId) => rideCall('advance_ride', { p_ride_id: rideId, p_step: 'ARRIVED' }, "We couldn't update this ride."),
  markPickedUp: (rideId) => rideCall('advance_ride', { p_ride_id: rideId, p_step: 'PICKED_UP' }, "We couldn't update this ride."),
  markCompleted: (rideId) => rideCall('advance_ride', { p_ride_id: rideId, p_step: 'COMPLETED' }, "We couldn't update this ride."),
  markNoShow: (rideId) => rideCall('advance_ride', { p_ride_id: rideId, p_step: 'NO_SHOW' }, "We couldn't update this ride."),

  undoDriverStep: (rideId, driverId) =>
    rideCall('undo_driver_step', { p_ride_id: rideId, p_driver_id: driverId }, "We couldn't undo that step."),
  async getImpact() {
    const { data, error } = await getSupabase()
      .rpc('get_impact')
      .single<{ rides_completed: number; money_saved: number | string; organizations: number; verified_drivers: number }>()
    if (error) fail(error, "We couldn't load the impact totals.")
    return {
      ridesCompleted: Number(data.rides_completed),
      moneySaved: Number(data.money_saved),
      organizations: Number(data.organizations),
      verifiedDrivers: Number(data.verified_drivers),
    }
  },
}
