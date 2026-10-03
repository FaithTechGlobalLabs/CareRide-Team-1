import { Hourglass } from 'lucide-react'
import { OfferCard } from '../../components/OfferCard'
import { RequestStatusCard } from '../../components/RequestStatusCard'
import { card, pageTitle } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useCurrentDriver } from '../../hooks/useCurrent'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

export function Requests() {
  const { refresh } = useApp()
  const driver = useCurrentDriver()
  const driverId = driver?.id ?? ''
  const houses = useData(() => dataService.listHouses()) ?? []

  const offers = useData(async () => {
    const pending = await dataService.listMyOffers(driverId)
    const rides = await Promise.all(pending.map((o) => dataService.getRide(o.rideId)))
    return pending.map((offer, i) => ({ offer, ride: rides[i] }))
  }, driverId)

  if (!driver) return <p>No driver profile found.</p>
  if (driver.status !== 'APPROVED') {
    return (
      <div className={`${card} mx-auto max-w-xl p-8 text-center`}>
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600" aria-hidden>
          <Hourglass className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">We're checking your documents</h1>
        <p className="mt-2 text-slate-600">
          The CareRide team reviews every driver before the first ride. Once you're approved, requests that fit your
          settings will show up right here.
        </p>
      </div>
    )
  }

  const pickupArea = (houseId: string) => {
    const house = houses.find((h) => h.id === houseId)
    return house && `${house.name}, ${house.city}`
  }

  async function setAvailable(available: boolean) {
    await dataService.updateDriver(driverId, { available })
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
      <RequestStatusCard driver={driver} onPause={setAvailable} showSettingsLink />

      {offers?.length === 0 && <p>No requests right now. We'll show them here.</p>}
      <div className="space-y-3">
        {offers?.map(
          ({ offer, ride }) =>
            ride && (
              <OfferCard
                key={offer.id}
                offer={offer}
                ride={ride}
                from={ride.returnOfRideId ? undefined : pickupArea(ride.houseId)}
                onRespond={(accept) => respond(offer.id, accept)}
              />
            ),
        )}
      </div>
      {/* TODO: poll or push so new requests appear without a refresh */}
    </div>
  )
}
