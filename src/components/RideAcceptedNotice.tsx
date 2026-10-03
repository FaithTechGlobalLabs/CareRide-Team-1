import { CarFront, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { useData } from '../hooks/useData'
import { acceptedMessage } from '../logic/acceptedMessage'
import { ridePath } from '../logic/homeFor'
import { dataService } from '../services'

// Only recent answers pop up; older ones are on the rides list.
const RECENT_MS = 12 * 3_600_000

function seenKey(userId: string): string {
  return `careride-seen-accepted:${userId}`
}

function readSeen(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]') as string[]
  } catch {
    return []
  }
}

function writeSeen(userId: string, rideIds: string[]): void {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(rideIds))
  } catch {
    // Ignore: the notice may show again after a reload
  }
}

// Tells the house (or its organization) the moment a driver accepts one of their rides.
export function RideAcceptedNotice() {
  const { currentUser, users } = useApp()
  const userId = currentUser?.id ?? ''
  const houseId = currentUser?.role === 'HOUSE' ? currentUser.houseId : undefined
  const orgId = currentUser?.role === 'ORG_ADMIN' ? currentUser.orgId : undefined
  const [seen, setSeen] = useState(() => readSeen(userId))

  const recent =
    useData(async () => {
      const rides = houseId
        ? await dataService.listRidesForHouse(houseId)
        : orgId
          ? await dataService.listRidesRequestedByOrg(orgId)
          : []
      const since = Date.now() - RECENT_MS
      return rides.filter((r) => r.status === 'ACCEPTED' && r.acceptedAt && new Date(r.acceptedAt).getTime() > since)
    }, userId) ?? []
  const drivers = useData(() => dataService.listDrivers()) ?? []
  const houses = useData(() => dataService.listHouses()) ?? []

  const fresh = recent
    .filter((r) => !seen.includes(r.id))
    .sort((a, b) => b.acceptedAt!.localeCompare(a.acceptedAt!))

  function dismiss(rideId: string) {
    const next = [...readSeen(userId), rideId]
    writeSeen(userId, next)
    setSeen(next)
  }

  return (
    <>
      {fresh.map((ride) => {
        const driver = drivers.find((d) => d.id === ride.driverId)
        const name = users.find((u) => u.id === driver?.userId)?.name
        const house = orgId ? houses.find((h) => h.id === ride.houseId) : undefined
        return (
          <div
            key={ride.id}
            role="status"
            className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-2xl shadow-brand-900/20"
          >
            <div className="flex items-start gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                <CarFront className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{acceptedMessage(ride, name)}</p>
                <p className="text-sm text-slate-600">
                  {[
                    house?.name,
                    `To ${ride.destinationName}`,
                    ride.clientName,
                    driver?.vehicle,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <Link
                  to={ridePath(currentUser?.role, ride.id)}
                  className="mt-1 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2"
                  onClick={() => dismiss(ride.id)}
                >
                  View ride
                </Link>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Dismiss"
                onClick={() => dismiss(ride.id)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )
      })}
    </>
  )
}
