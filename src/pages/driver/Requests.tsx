import { AvailabilityToggle } from '../../components/AvailabilityToggle'
import { OfferCard } from '../../components/OfferCard'
import { pageTitle } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

export function Requests() {
  const { currentUser, refresh } = useApp()
  const drivers = useData(() => dataService.listDrivers())
  const driver = drivers?.find((d) => d.userId === currentUser?.id)
  const driverId = driver?.id ?? ''

  const offers = useData(async () => {
    const pending = await dataService.listMyOffers(driverId)
    const rides = await Promise.all(pending.map((o) => dataService.getRide(o.rideId)))
    return pending.map((offer, i) => ({ offer, ride: rides[i] }))
  }, driverId)

  if (!driver) return <p>No driver profile found.</p>
  if (driver.status !== 'APPROVED') {
    return (
      <div>
        <h1 className={pageTitle}>Thanks for signing up</h1>
        <p>Your documents are being reviewed. You'll get ride requests once you're approved.</p>
      </div>
    )
  }

  async function setAvailable(available: boolean) {
    await dataService.setAvailability(driverId, available)
    refresh()
  }

  async function respond(offerId: string, accept: boolean) {
    try {
      await dataService.respondToOffer(offerId, accept)
    } catch (err) {
      alert((err as Error).message)
    }
    refresh()
  }

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Ride requests</h1>
      <AvailabilityToggle available={driver.available} onChange={setAvailable} />

      {offers?.length === 0 && <p>No requests right now. We'll show them here.</p>}
      <div className="space-y-3">
        {offers?.map(
          ({ offer, ride }) =>
            ride && (
              <OfferCard key={offer.id} offer={offer} ride={ride} onRespond={(accept) => respond(offer.id, accept)} />
            ),
        )}
      </div>
      {/* TODO: poll or push so new requests appear without a refresh */}
    </div>
  )
}
