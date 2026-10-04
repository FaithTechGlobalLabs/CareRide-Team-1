import type { House, Ride } from '../../types'

// Helpers for the org admin's ride lists.

export const FINISHED: Ride['status'][] = ['COMPLETED', 'NO_SHOW', 'CANCELLED']
export const RECENT_DAYS = 7

export const byPickup = (a: Ride, b: Ride) => a.pickupTime.localeCompare(b.pickupTime)

export function isFinished(ride: Ride): boolean {
  return FINISHED.includes(ride.status)
}

// Finished rides with a pickup time in the last 7 days (or later, e.g. cancelled ahead of time).
export function isRecent(ride: Ride, now = new Date()): boolean {
  return isFinished(ride) && new Date(ride.pickupTime).getTime() >= now.getTime() - RECENT_DAYS * 86_400_000
}

// e.g. ["Belkin House: 4 completed, 1 no-show", ...]
export function recentCountsByHouse(rides: Ride[], houses: House[]): string[] {
  const parts: [Ride['status'], string][] = [
    ['COMPLETED', 'completed'],
    ['NO_SHOW', 'no-show'],
    ['CANCELLED', 'cancelled'],
  ]
  const houseIds = [...new Set(rides.map((r) => r.houseId))]
  return houseIds.map((houseId) => {
    const name = houses.find((h) => h.id === houseId)?.name ?? 'Unknown partner'
    const counts = parts
      .map(([status, word]) => {
        const n = rides.filter((r) => r.houseId === houseId && r.status === status).length
        return n > 0 ? `${n} ${word}` : ''
      })
      .filter(Boolean)
    return `${name}: ${counts.join(', ')}`
  })
}
