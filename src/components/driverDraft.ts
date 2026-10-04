import { DEFAULT_REQUEST_HOURS, requestHoursError } from '../logic/requestHours'
import { MAX_NAME, isPhone, tooLong } from '../logic/validate'
import type { NewDriver, NewDriverUser } from '../services/dataService'

// Form state for DriverFields: the driver's account details plus their driver profile.
export type DriverDraft = NewDriverUser & NewDriver

export const emptyDriverDraft: DriverDraft = {
  name: '',
  phone: '',
  background: 'TAXI',
  vehicle: '',
  wheelchairAccessible: false,
  seats: 3,
  serviceCities: [],
  requestHours: DEFAULT_REQUEST_HOURS,
  minNoticeHours: 1,
}

export function splitDriverDraft({ name, phone, ...driver }: DriverDraft): [NewDriverUser, NewDriver] {
  return [{ name, phone }, driver]
}

export type FieldErrors = Record<string, string | undefined>

export function needsProfessionalProof(value: Pick<DriverDraft, 'background'>): boolean {
  return value.background === 'TAXI' || value.background === 'RIDESHARE'
}

// Every check for a driver added in one go, e.g. by an organization for one of its own drivers
export function validateDriverDraft(d: DriverDraft): FieldErrors {
  const errors: FieldErrors = {
    name: !d.name.trim() ? "Please enter the driver's name." : tooLong(d.name, MAX_NAME),
    phone: isPhone(d.phone) ? undefined : 'Please enter a 10-digit phone number.',
    vehicle: !d.vehicle.trim() ? 'Describe the vehicle so clients can find it.' : tooLong(d.vehicle, MAX_NAME),
    serviceCities: d.serviceCities.length ? undefined : 'Pick at least one city.',
    requestHours: requestHoursError(d.requestHours),
    licenceFile: d.licenceFile ? undefined : "Please add the driver's licence.",
  }
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v))
}
