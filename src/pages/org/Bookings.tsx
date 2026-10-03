import { OfferCard } from '../../components/OfferCard'
import { RideCard } from '../../components/RideCard'
import { pageTitle } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useCurrentOrg } from '../../hooks/useCurrent'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

// Ride requests sent to this organization's drivers. The org can answer for them.
export function Bookings() {
  const { currentUser, users, refresh } = useApp()
  const org = useCurrentOrg()
  const orgId = currentUser?.orgId ?? ''

  const drivers = useData(() => dataService.listDrivers(orgId), orgId) ?? []
  const houses = useData(() => dataService.listHouses()) ?? []
  const rides = useData(() => dataService.listRidesForOrg(orgId), orgId) ?? []
  const offers = useData(async () => {
    const pending = await dataService.listOffersForOrg(orgId)
    const offerRides = await Promise.all(pending.map((o) => dataService.getRide(o.rideId)))
    return pending.map((offer, i) => ({ offer, ride: offerRides[i] }))
  }, orgId)

  const driverName = (driverId?: string) =>
    users.find((u) => u.id === drivers.find((d) => d.id === driverId)?.userId)?.name
  const houseName = (houseId: string) => houses.find((h) => h.id === houseId)?.name

  async function respond(offerId: string, accept: boolean) {
    try {
      await dataService.respondToOffer(offerId, accept)
    } catch (err) {
      alert((err as Error).message)
    }
    refresh()
  }

  const upcoming = rides.filter((r) => r.status === 'ACCEPTED' || r.status === 'PICKED_UP')

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Bookings</h1>
      {org?.bookingNotifications && (
        <p className="text-slate-600">
          New bookings are sent to {org.bookingNotifications}. (Demo: notifications aren't actually sent.)
        </p>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold">New requests</h2>
        {offers?.length === 0 && <p>No new requests.</p>}
        <div className="space-y-3">
          {offers?.map(
            ({ offer, ride }) =>
              ride && (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  ride={ride}
                  from={houseName(ride.houseId)}
                  driverName={driverName(offer.driverId)}
                  onRespond={(accept) => respond(offer.id, accept)}
                />
              ),
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Upcoming rides</h2>
        {upcoming.length === 0 && <p>No upcoming rides.</p>}
        <div className="space-y-3">
          {upcoming.map((r) => (
            <RideCard key={r.id} ride={r} from={houseName(r.houseId)}>
              <p className="w-full text-slate-600">Driver: {driverName(r.driverId)}</p>
            </RideCard>
          ))}
        </div>
      </section>
    </div>
  )
}
