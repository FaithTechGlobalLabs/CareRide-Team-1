import { Link } from 'react-router-dom'
import { ImpactCounter } from '../../components/ImpactCounter'
import { RideCard } from '../../components/RideCard'
import { pageTitle, primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'
import type { Ride } from '../../types'

const FINISHED: Ride['status'][] = ['COMPLETED', 'CANCELLED']

export function Dashboard() {
  const { currentUser } = useApp()
  const facilityId = currentUser?.facilityId ?? ''
  const rides = useData(() => dataService.listRidesForFacility(facilityId), facilityId) ?? []

  const needsAttention = rides.filter((r) => r.status === 'NEEDS_ATTENTION')
  const active = rides.filter((r) => r.status !== 'NEEDS_ATTENTION' && !FINISHED.includes(r.status))
  const finished = rides.filter((r) => FINISHED.includes(r.status))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Rides</h1>
        <Link to="/staff/request" className={primaryButton}>
          Request a ride
        </Link>
      </div>

      <ImpactCounter />

      {needsAttention.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-red-800">Needs attention ({needsAttention.length})</h2>
          <div className="space-y-3">
            {needsAttention.map((r) => (
              <RideCard key={r.id} ride={r} to={`/staff/ride/${r.id}`} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className={pageTitle}>Active</h2>
        {active.length === 0 && <p>No active rides.</p>}
        <div className="space-y-3">
          {active.map((r) => (
            <RideCard key={r.id} ride={r} to={`/staff/ride/${r.id}`} />
          ))}
        </div>
      </section>

      <section>
        <h2 className={pageTitle}>Finished</h2>
        {finished.length === 0 && <p>No finished rides yet.</p>}
        <div className="space-y-3">
          {finished.map((r) => (
            <RideCard key={r.id} ride={r} to={`/staff/ride/${r.id}`} />
          ))}
        </div>
      </section>
    </div>
  )
}
