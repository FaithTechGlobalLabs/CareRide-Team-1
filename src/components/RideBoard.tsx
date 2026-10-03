import { CarFront } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { useData } from '../hooks/useData'
import { acceptedMessage } from '../logic/acceptedMessage'
import { ridePath } from '../logic/homeFor'
import { dataService } from '../services'
import type { House, Ride } from '../types'
import { RideCard } from './RideCard'
import { pageTitle } from './ui'

const FINISHED: Ride['status'][] = ['COMPLETED', 'NO_SHOW', 'CANCELLED']

interface Props {
  rides: Ride[]
  houses?: House[] // pass to show which house each ride is from
}

// A house's or organization's rides: needing attention, upcoming, and past.
export function RideBoard({ rides, houses }: Props) {
  const { currentUser, users } = useApp()
  const drivers = useData(() => dataService.listDrivers()) ?? []

  const byPickup = (a: Ride, b: Ride) => a.pickupTime.localeCompare(b.pickupTime)
  const needsAttention = rides.filter((r) => r.status === 'NEEDS_ATTENTION').sort(byPickup)
  const active = rides.filter((r) => r.status !== 'NEEDS_ATTENTION' && !FINISHED.includes(r.status)).sort(byPickup)
  const finished = rides.filter((r) => FINISHED.includes(r.status)).sort((a, b) => byPickup(b, a))

  const card = (r: Ride) => {
    const driver = drivers.find((d) => d.id === r.driverId)
    const name = users.find((u) => u.id === driver?.userId)?.name
    return (
      <RideCard
        key={r.id}
        ride={r}
        from={houses?.find((h) => h.id === r.houseId)?.name}
        to={ridePath(currentUser?.role, r.id)}
      >
        {driver && (r.status === 'ACCEPTED' || r.status === 'PICKED_UP') && (
          <p className="flex w-full items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-900">
            <CarFront className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span>
              {acceptedMessage(r, name)}
              <span className="block font-normal text-brand-800">{driver.vehicle}</span>
            </span>
          </p>
        )}
      </RideCard>
    )
  }

  return (
    <>
      {needsAttention.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-red-800">Needs attention ({needsAttention.length})</h2>
          <div className="space-y-3">{needsAttention.map(card)}</div>
        </section>
      )}

      <section>
        <h2 className={pageTitle}>Upcoming</h2>
        {active.length === 0 && <p>No upcoming rides.</p>}
        <div className="space-y-3">{active.map(card)}</div>
      </section>

      <section>
        <h2 className={pageTitle}>Past rides</h2>
        {finished.length === 0 && <p>No past rides yet.</p>}
        <div className="space-y-3">{finished.map(card)}</div>
      </section>
    </>
  )
}
