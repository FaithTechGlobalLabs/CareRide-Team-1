import { DriverTripActions, driverRideStatusLabel } from '../../components/DriverTripActions'
import { RideCard } from '../../components/RideCard'
import { pageTitle } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useCurrentDriver } from '../../hooks/useCurrent'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

export function MyRides() {
  const { refresh } = useApp()
  const driver = useCurrentDriver()
  const driverId = driver?.id ?? ''
  const rides = useData(() => dataService.listMyRides(driverId), driverId) ?? []
  const houses = useData(() => dataService.listHouses()) ?? []

  const current = rides
    .filter((r) => r.status === 'ACCEPTED' || r.status === 'PICKED_UP')
    .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime))
  const past = rides.filter((r) => r.status === 'COMPLETED' || r.status === 'NO_SHOW')

  return (
    <div className="space-y-8">
      <section>
        <h1 className={pageTitle}>My rides</h1>
        {current.length === 0 && <p>No upcoming rides.</p>}
        <div className="space-y-3">
          {current.map((r) => (
            <RideCard key={r.id} ride={r} statusLabel={driverRideStatusLabel(r)}>
              <DriverTripActions
                ride={r}
                house={houses.find((h) => h.id === r.houseId)}
                driverId={driverId}
                onDone={refresh}
              />
            </RideCard>
          ))}
        </div>
      </section>

      <section>
        <h2 className={pageTitle}>Past rides</h2>
        {past.length === 0 && <p>No past rides yet.</p>}
        <div className="space-y-3">
          {past.map((r) => (
            <RideCard key={r.id} ride={r} />
          ))}
        </div>
      </section>
    </div>
  )
}
