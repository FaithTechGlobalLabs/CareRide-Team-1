import { DEFAULT_REQUEST_HOURS } from '../logic/requestHours'
import type { NewDriver, NewDriverUser } from '../services/dataService'

// Form state for DriverFields: the driver's account details plus their driver profile.
export type DriverDraft = NewDriverUser & NewDriver

export const emptyDriverDraft: DriverDraft = {
  name: '',
  phone: '',
  vehicle: '',
  wheelchairAccessible: false,
  seats: 3,
  serviceCities: [],
  requestHours: DEFAULT_REQUEST_HOURS,
  minNoticeMinutes: 60,
}

export function splitDriverDraft({ name, phone, ...driver }: DriverDraft): [NewDriverUser, NewDriver] {
  return [{ name, phone }, driver]
}

export type FieldErrors = Record<string, string | undefined>
