import { RideCard } from '../../components/RideCard'
import { pageTitle, primaryButton, secondaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

export function MyRides() {
  const { currentUser, refresh } = useApp()
  const drivers = useData(() => dataService.listDrivers())
  const driver = drivers?.find((d) => d.userId === currentUser?.id)
  const driverId = driver?.id ?? ''
  const rides = useData(() => dataService.listMyRides(driverId), driverId) ?? []

  async function run(action: () => Promise<unknown>) {
    await action()
    refresh()
  }

  const current = rides.filter((r) => r.status === 'ACCEPTED' || r.status === 'PICKED_UP')
  const past = rides.filter((r) => r.status === 'COMPLETED')

  return (
    <div className="space-y-8">
      <section>
        <h1 className={pageTitle}>My rides</h1>
        {current.length === 0 && <p>No upcoming rides.</p>}
        <div className="space-y-3">
          {current.map((r) => (
            <RideCard key={r.id} ride={r}>
              <p className="w-full">
                <strong>Pick up at:</strong> {r.pickupAddress}
                {r.notes && (
                  <>
                    <br />
                    <strong>Notes:</strong> {r.notes}
                  </>
                )}
              </p>
              {r.status === 'ACCEPTED' && (
                <>
                  <button type="button" className={primaryButton} onClick={() => run(() => dataService.markPickedUp(r.id))}>
                    Picked up
                  </button>
                  <button type="button" className={secondaryButton} onClick={() => run(() => dataService.dropRide(r.id, driverId))}>
                    I can't make it
                  </button>
                </>
              )}
              {r.status === 'PICKED_UP' && (
                <button type="button" className={primaryButton} onClick={() => run(() => dataService.markCompleted(r.id))}>
                  Dropped off
                </button>
              )}
            </RideCard>
          ))}
        </div>
      </section>

      <section>
        <h2 className={pageTitle}>Completed</h2>
        {past.length === 0 && <p>No completed rides yet.</p>}
        <div className="space-y-3">
          {past.map((r) => (
            <RideCard key={r.id} ride={r} />
          ))}
        </div>
      </section>
    </div>
  )
}
