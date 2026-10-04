import { CalendarX, X } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../hooks/useApp'
import { useCurrentDriver } from '../hooks/useCurrent'
import { useData } from '../hooks/useData'
import { formatDayTime } from '../logic/formatTime'
import { dataService } from '../services'
import { markSeen, readSeen } from './seenNotices'

// Only recent cancellations pop up.
const RECENT_MS = 12 * 3_600_000

// Tells a driver (or the org answering for its drivers) that a ride they accepted was cancelled,
// so nobody drives to a pickup that isn't happening.
export function RideCancelledNotice() {
  const { currentUser } = useApp()
  const driver = useCurrentDriver()
  const userId = currentUser?.id ?? ''
  const driverId = currentUser?.role === 'DRIVER' ? driver?.id : undefined
  const orgId = currentUser?.role === 'ORG_ADMIN' ? currentUser.orgId : undefined
  const [seen, setSeen] = useState(() => readSeen(userId, 'cancelled'))

  const cancelled =
    useData(async () => {
      const rides = driverId
        ? await dataService.listMyRides(driverId)
        : orgId
          ? await dataService.listRidesForOrg(orgId)
          : []
      const since = Date.now() - RECENT_MS
      return rides.filter((r) => r.status === 'CANCELLED' && r.cancelledAt && new Date(r.cancelledAt).getTime() > since)
    }, driverId ?? orgId) ?? []
  const houses = useData(() => dataService.listHouses()) ?? []

  return (
    <>
      {cancelled
        .filter((r) => !seen.includes(r.id))
        .map((ride) => {
          const house = houses.find((h) => h.id === ride.houseId)
          return (
            <div key={ride.id} role="alert" className="rounded-xl border-2 border-red-300 bg-white p-5 shadow-xl">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600" aria-hidden>
                  <CalendarX className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Ride cancelled. You don't need to go.</p>
                  <p className="text-sm text-slate-600">
                    {[
                      house?.name,
                      `To ${ride.destinationName}`,
                      ride.type === 'ON_DEMAND' ? undefined : formatDayTime(ride.pickupTime),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Dismiss"
                  onClick={() => setSeen(markSeen(userId, 'cancelled', ride.id))}
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
