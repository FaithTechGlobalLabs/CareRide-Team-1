import { Link } from 'react-router-dom'
import { ImpactCounter } from '../../components/ImpactCounter'
import { RideCard } from '../../components/RideCard'
import { pageTitle, primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'
import type { Ride } from '../../types'

const FINISHED: Ride['status'][] = ['COMPLETED', 'NO_SHOW', 'CANCELLED']

export function Dashboard() {
  const { currentUser } = useApp()
  const houseId = currentUser?.houseId ?? ''
  const rides = useData(() => dataService.listRidesForHouse(houseId), houseId) ?? []

  const byPickup = (a: Ride, b: Ride) => a.pickupTime.localeCompare(b.pickupTime)
  const needsAttention = rides.filter((r) => r.status === 'NEEDS_ATTENTION').sort(byPickup)
  const active = rides.filter((r) => r.status !== 'NEEDS_ATTENTION' && !FINISHED.includes(r.status)).sort(byPickup)
  const finished = rides.filter((r) => FINISHED.includes(r.status)).sort((a, b) => byPickup(b, a))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{currentUser?.name} rides</h1>
        <Link to="/house/request" className={`${primaryButton} w-full sm:w-auto`}>
          Request a ride
        </Link>
      </div>

      <ImpactCounter />

      {needsAttention.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-red-800">Needs attention ({needsAttention.length})</h2>
          <div className="space-y-3">
            {needsAttention.map((r) => (
              <RideCard key={r.id} ride={r} to={`/house/ride/${r.id}`} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className={pageTitle}>Upcoming</h2>
        {active.length === 0 && <p>No upcoming rides.</p>}
        <div className="space-y-3">
          {active.map((r) => (
            <RideCard key={r.id} ride={r} to={`/house/ride/${r.id}`} />
          ))}
        </div>
      </section>

      <section>
        <h2 className={pageTitle}>Past rides</h2>
        {finished.length === 0 && <p>No past rides yet.</p>}
        <div className="space-y-3">
          {finished.map((r) => (
            <RideCard key={r.id} ride={r} to={`/house/ride/${r.id}`} />
          ))}
        </div>
      </section>
    </div>
  )
}
