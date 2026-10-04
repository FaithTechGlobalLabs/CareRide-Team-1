import type { DriverBackground, OrgType, RideType } from './types'

export const RIDE_TYPE_LABELS: Record<RideType, string> = {
  SCHEDULED: 'Scheduled',
  ON_DEMAND: 'On Demand',
}

export const CITIES = ['Vancouver', 'Richmond']

export const MIN_PASSWORD_LENGTH = 8

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const BACKGROUND_LABELS: Record<DriverBackground, string> = {
  TAXI: 'Taxi driver',
  RIDESHARE: 'Rideshare driver',
  ORG_DRIVER: 'Driver for an organization',
  INDEPENDENT: 'Independent volunteer',
}

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  PARTNER_ORG: 'Partner organization (requests rides)',
  TRANSPORT_PROVIDER: 'Transport provider (gives rides)',
}

export const DEFAULT_PICKUP_INSTRUCTIONS = 'Driver meets the client in the front lobby.'
