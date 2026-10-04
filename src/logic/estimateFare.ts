// Adult one-zone Vancouver bus fare (TransLink).
// Municipal transit is GST/HST-exempt, so nothing is added on top.
export const BUS_FARE = 2.58

export function estimateFare(): number {
  return BUS_FARE
}

// Bus fares saved is always completed rides × one-zone fare, never a stored or placeholder amount.
export function faresSavedFor(completedRides: number): number {
  return completedRides * BUS_FARE
}

// The dollar total is one fare for each completed trip, not one fare for each passenger.
export const FARE_SAVED_NOTE = 'One fare per completed trip'

export function formatDollars(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
