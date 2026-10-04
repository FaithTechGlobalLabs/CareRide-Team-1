import { CarFront, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { useData } from '../hooks/useData'
import { acceptedMessage } from '../logic/acceptedMessage'
import { ridePath } from '../logic/homeFor'
import { riderLabel } from '../logic/rideText'
import { dataService } from '../services'
import type { Ride } from '../types'
import { markSeen, readSeen } from './seenNotices'

// Only recent answers pop up; older ones are on the rides list.
const RECENT_MS = 12 * 3_600_000

// One notice per acceptance: if a driver drops the ride and another accepts, that's news again.
function noticeId(ride: Ride): string {
  return `${ride.id}:${ride.acceptedAt}`
}

// Tells the partner organization the moment a driver accepts one of their rides.
export function RideAcceptedNotice() {
  const { currentUser, users } = useApp()
  const userId = currentUser?.id ?? ''
  const houseId = currentUser?.role === 'PARTNER' ? currentUser.houseId : undefined
  const [seen, setSeen] = useState(() => readSeen(userId, 'accepted'))

  const recent =
    useData(async () => {
      const rides = houseId ? await dataService.listRidesForHouse(houseId) : []
      const since = Date.now() - RECENT_MS
      return rides.filter((r) => r.status === 'ACCEPTED' && r.acceptedAt && new Date(r.acceptedAt).getTime() > since)
    }, userId) ?? []
  const drivers = useData(() => dataService.listDrivers()) ?? []

  const fresh = recent
    .filter((r) => !seen.includes(noticeId(r)))
    .sort((a, b) => b.acceptedAt!.localeCompare(a.acceptedAt!))

  function dismiss(ride: Ride) {
    setSeen(markSeen(userId, 'accepted', noticeId(ride)))
  }

  return (
    <>
      {fresh.map((ride) => {
        const driver = drivers.find((d) => d.id === ride.driverId)
        const name = users.find((u) => u.id === driver?.userId)?.name
        return (
          <div
            key={ride.id}
            role="status"
            className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xl"
          >
            <div className="flex items-start gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                <CarFront className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{acceptedMessage(ride, name)}</p>
                <p className="text-sm text-slate-600">
                  {[
                    `To ${ride.destinationName}`,
                    riderLabel(ride),
                    driver?.vehicle,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <Link
                  to={ridePath(ride.id)}
                  className="mt-1 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2"
                  onClick={() => dismiss(ride)}
                >
                  View ride
                </Link>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Dismiss"
                onClick={() => dismiss(ride)}
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
