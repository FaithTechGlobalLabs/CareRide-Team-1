// Adult one-zone Vancouver bus fare (TransLink).
// Municipal transit is GST/HST-exempt, so nothing is added on top.
const BUS_FARE = 2.58

export function estimateFare(): number {
  return BUS_FARE
}

export function formatDollars(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
