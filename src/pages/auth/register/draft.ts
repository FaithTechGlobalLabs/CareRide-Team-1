import { emptyDriverDraft, type DriverDraft, type FieldErrors } from '../../../components/driverDraft'
import { CITIES, MIN_PASSWORD_LENGTH } from '../../../constants'
import { requestHoursError } from '../../../logic/requestHours'

export type RegisterRole = 'PARTNER' | 'PROVIDER' | 'DRIVER'

export interface DestinationDraft {
  key: string
  name: string
  address: string
  city: string
}

export interface RegisterDraft {
  role?: RegisterRole
  name: string
  email: string
  password: string
  orgName: string
  orgPhone: string
  notifications: string
  addHouse: boolean
  house: { name: string; address: string; city: string; phone: string; email: string; placeId?: string }
  destinations: DestinationDraft[]
  driver: DriverDraft
}

export const emptyRegisterDraft: RegisterDraft = {
  name: '',
  email: '',
  password: '',
  orgName: '',
  orgPhone: '',
  notifications: '',
  addHouse: true,
  house: { name: '', address: '', city: CITIES[0], phone: '', email: '' },
  destinations: [],
  driver: { ...emptyDriverDraft },
}

// Common destinations a partner organization can add with one tap.
export const SUGGESTED_DESTINATIONS: DestinationDraft[] = [
  { key: 'stp', name: "St. Paul's Hospital", address: '1081 Burrard St, Vancouver', city: 'Vancouver' },
  { key: 'vgh', name: 'Vancouver General Hospital', address: '899 W 12th Ave, Vancouver', city: 'Vancouver' },
  { key: 'rh', name: 'Richmond Hospital', address: '7000 Westminster Hwy, Richmond', city: 'Richmond' },
]

// ---- Validation, one function per step. Returns field id -> message.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 10
}

function compact(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v))
}

export function validateRole(d: RegisterDraft): FieldErrors {
  return compact({ role: d.role ? undefined : 'Choose how you will use CareRide to continue.' })
}

export function validateAccount(d: RegisterDraft): FieldErrors {
  return compact({
    name: d.name.trim() ? undefined : 'Please enter your name.',
    email: !d.email.trim()
      ? 'Please enter your email.'
      : EMAIL.test(d.email.trim())
        ? undefined
        : 'That email doesn’t look right. Check for typos.',
    password: d.password.length >= MIN_PASSWORD_LENGTH ? undefined : `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    phone: d.role === 'DRIVER' && !isPhone(d.driver.phone) ? 'Please enter a 10-digit phone number.' : undefined,
  })
}

export function validateOrganization(d: RegisterDraft): FieldErrors {
  return compact({
    orgName: d.orgName.trim() ? undefined : 'Please enter your organization’s name.',
    orgPhone: isPhone(d.orgPhone) ? undefined : 'Please enter a 10-digit phone number.',
    notifications:
      d.role === 'PROVIDER' && !d.notifications.trim()
        ? 'Tell us where to send new bookings.'
        : undefined,
  })
}

export function validateHouse(d: RegisterDraft): FieldErrors {
  if (!d.addHouse) return {}
  const h = d.house
  return compact({
    houseName: h.name.trim() ? undefined : 'Please enter the house name.',
    houseAddress: h.placeId
      ? undefined
      : h.address.trim()
        ? 'Pick a matching address from the list.'
        : 'Search for the address and pick it from the list.',
    housePhone: isPhone(h.phone) ? undefined : 'Please enter a 10-digit phone number.',
    houseEmail: h.email.trim() && !EMAIL.test(h.email.trim()) ? 'That email doesn’t look right.' : undefined,
  })
}

export function validateVehicle(d: RegisterDraft): FieldErrors {
  return compact({
    vehicle: d.driver.vehicle.trim() ? undefined : 'Describe your vehicle so clients can find it.',
    serviceCities: d.driver.serviceCities.length ? undefined : 'Pick at least one city.',
  })
}

export function validateRequestHours(d: RegisterDraft): FieldErrors {
  return compact({ requestHours: requestHoursError(d.driver.requestHours) })
}
