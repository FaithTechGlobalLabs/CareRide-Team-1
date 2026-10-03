import { Phone } from 'lucide-react'
import { ConfirmButton } from '../../components/ConfirmButton'
import { RideCard } from '../../components/RideCard'
import { dangerButton, pageTitle, primaryButton, secondaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useCurrentDriver } from '../../hooks/useCurrent'
import { useData } from '../../hooks/useData'
import { formatTime } from '../../logic/formatTime'
import { dataService } from '../../services'

export function MyRides() {
  const { refresh } = useApp()
  const driver = useCurrentDriver()
  const driverId = driver?.id ?? ''
  const rides = useData(() => dataService.listMyRides(driverId), driverId) ?? []
  const houses = useData(() => dataService.listHouses()) ?? []

  async function run(action: () => Promise<unknown>) {
    await action()
    refresh()
  }

  function callHouse(houseId: string) {
    const house = houses.find((h) => h.id === houseId)
    if (!house?.phone) return null
    return (
      <a href={`tel:${house.phone}`} className={`${secondaryButton} w-full sm:w-auto`}>
        <Phone className="h-5 w-5" aria-hidden />
        <span className="whitespace-normal">
          Call {house.name}: <span className="whitespace-nowrap">{house.phone}</span>
        </span>
      </a>
    )
  }

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
            <RideCard key={r.id} ride={r}>
              <p className="w-full">
                <strong>Pick up at:</strong> {r.pickupAddress}
                {r.pickupInstructions && (
                  <>
                    <br />
                    <strong>Meet:</strong> {r.pickupInstructions}
                  </>
                )}
                <br />
                <strong>Drop off at:</strong> {r.destinationAddress}
                {r.notes && (
                  <>
                    <br />
                    <strong>Notes:</strong> {r.notes}
                  </>
                )}
              </p>
              {callHouse(r.houseId)}
              {r.status === 'ACCEPTED' && (
                <>
                  {r.driverArrivedAt ? (
                    <p role="status" className="w-full rounded-xl bg-brand-50 p-3 font-semibold text-brand-900">
                      You told the house you're here at {formatTime(r.driverArrivedAt)}.
                    </p>
                  ) : (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => run(() => dataService.markDriverArrived(r.id))}
                    >
                      I'm here
                    </button>
                  )}
                  <button type="button" className={primaryButton} onClick={() => run(() => dataService.markPickedUp(r.id))}>
                    Picked up
                  </button>
                  <ConfirmButton
                    className={secondaryButton}
                    title="Client didn't show?"
                    body="The client loses this ride. It won't be rebooked."
                    confirmLabel="Yes, client didn't show"
                    confirmClassName={dangerButton}
                    onConfirm={() => run(() => dataService.markNoShow(r.id))}
                  >
                    Client didn't show
                  </ConfirmButton>
                  <ConfirmButton
                    className={secondaryButton}
                    title="Can't make this ride?"
                    body="The house will see it, and we'll ask another driver."
                    confirmLabel="Yes, I can't make it"
                    confirmClassName={dangerButton}
                    onConfirm={() => run(() => dataService.dropRide(r.id, driverId))}
                  >
                    I can't make it
                  </ConfirmButton>
                </>
              )}
              {r.status === 'PICKED_UP' && (
                <button type="button" className={primaryButton} onClick={() => run(() => dataService.markCompleted(r.id))}>
                  Dropped off: tell the house
                </button>
              )}
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
