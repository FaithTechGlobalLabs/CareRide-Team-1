import type { Destination, Ride } from '../types'

// Orders destinations by how often this house has used them, most-visited first.
export function sortByPopularity(destinations: Destination[], rides: Ride[], houseId: string): Destination[] {
  const counts = new Map<string, number>()
  for (const r of rides) {
    if (r.houseId === houseId && r.destinationId) {
      counts.set(r.destinationId, (counts.get(r.destinationId) ?? 0) + 1)
    }
  }
  return [...destinations].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
}
