import { emptyDriverDraft, needsProfessionalProof, type DriverDraft, type FieldErrors } from '../../../components/driverDraft'
import { MIN_PASSWORD_LENGTH } from '../../../constants'
import { requestHoursError } from '../../../logic/requestHours'
import { EMAIL, MAX_NAME, isPhone, tooLong } from '../../../logic/validate'

// Transport providers will come back later; for now it's partner organizations and drivers.
export type RegisterRole = 'PARTNER' | 'DRIVER'

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
  // Where rides start
  address: string
  city: string
  placeId?: string
  destinations: DestinationDraft[]
  driver: DriverDraft
}

export const emptyRegisterDraft: RegisterDraft = {
  name: '',
  email: '',
  password: '',
  orgName: '',
  orgPhone: '',
  address: '',
  city: '',
  destinations: [],
  driver: { ...emptyDriverDraft, background: 'TAXI' },
}

// ---- Validation, one function per step. Returns field id -> message.

function compact(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v))
}

export function validateRole(d: RegisterDraft): FieldErrors {
  return compact({ role: d.role ? undefined : 'Choose how you will use CareRide to continue.' })
}

export function validateAccount(d: RegisterDraft): FieldErrors {
  return compact({
    name: d.name.trim() ? tooLong(d.name, MAX_NAME) : 'Please enter your name.',
    phone:
      d.role === 'DRIVER' ? (isPhone(d.driver.phone) ? undefined : 'Please enter a 10-digit phone number.') : undefined,
    email: !d.email.trim()
      ? 'Please enter your email.'
      : EMAIL.test(d.email.trim())
        ? undefined
        : 'That email doesn’t look right. Check for typos.',
    password: d.password.length >= MIN_PASSWORD_LENGTH ? undefined : `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  })
}

export function validateOrganization(d: RegisterDraft): FieldErrors {
  return compact({
    orgName: d.orgName.trim() ? tooLong(d.orgName, MAX_NAME) : 'Please enter your organization’s name.',
    address: d.placeId
      ? undefined
      : d.address.trim()
        ? 'Pick a matching address from the list.'
        : 'Search for the address and pick it from the list.',
    orgPhone: isPhone(d.orgPhone) ? undefined : 'Please enter a 10-digit phone number.',
  })
}

export function validateVehicle(d: RegisterDraft): FieldErrors {
  return compact({
    vehicle: d.driver.vehicle.trim() ? tooLong(d.driver.vehicle, MAX_NAME) : 'Describe your vehicle so clients can find it.',
    serviceCities: d.driver.serviceCities.length ? undefined : 'Pick at least one city.',
  })
}

export function validateRequestHours(d: RegisterDraft): FieldErrors {
  return compact({ requestHours: requestHoursError(d.driver.requestHours) })
}

export function validateDocuments(d: RegisterDraft): FieldErrors {
  return compact({
    licenceFile: d.driver.licenceFile ? undefined : 'Please add your driver’s licence.',
    proofFile:
      needsProfessionalProof(d.driver) && !d.driver.proofFile ? 'Please add proof you drive professionally.' : undefined,
  })
}
