import { OfferCard } from '../../components/OfferCard'
import { RideCard } from '../../components/RideCard'
import { pageTitle } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useCurrentOrg } from '../../hooks/useCurrent'
import { useData } from '../../hooks/useData'
import { isDriverLate } from '../../logic/rideAlerts'
import { dataService } from '../../services'
import { byPickup, isRecent, recentCountsByHouse } from './orgRideLists'
import type { Ride } from '../../types'

// Ride requests sent to this organization's drivers. The org can answer for them,
// and sees its drivers' upcoming and recent rides.
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

  const upcoming = rides.filter((r) => r.status === 'ACCEPTED' || r.status === 'PICKED_UP').sort(byPickup)
  // Most recent first
  const finishedAt = (r: Ride) => r.completedAt ?? r.cancelledAt ?? r.pickupTime
  const recent = rides.filter((r) => isRecent(r)).sort((a, b) => finishedAt(b).localeCompare(finishedAt(a)))

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
            <RideCard
              key={r.id}
              ride={r}
              from={houseName(r.houseId)}
              alert={isDriverLate(r) ? "Late: the client hasn't been picked up" : undefined}
            >
              <p className="w-full text-slate-600">Driver: {driverName(r.driverId)}</p>
            </RideCard>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Recent: last 7 days</h2>
        {recent.length === 0 && <p>No finished rides in the last 7 days.</p>}
        {recent.length > 0 && (
          <ul className="mb-4 space-y-1 font-semibold text-slate-700">
            {recentCountsByHouse(recent, houses).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <div className="space-y-3">
          {recent.map((r) => (
            <RideCard key={r.id} ride={r} from={houseName(r.houseId)}>
              <p className="w-full text-slate-600">Driver: {driverName(r.driverId)}</p>
            </RideCard>
          ))}
        </div>
      </section>
    </div>
  )
}
