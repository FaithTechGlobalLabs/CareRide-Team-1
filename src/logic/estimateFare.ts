// Rough taxi cost used for the impact counter.
// TODO: replace the flat estimate with a distance-based one (pickup to destination).
const FLAT_ESTIMATE = 25

export function estimateFare(): number {
  return FLAT_ESTIMATE
}
