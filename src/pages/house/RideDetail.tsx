import { useParams } from 'react-router-dom'
import { ClientSlip } from '../../components/ClientSlip'
import { RideCard } from '../../components/RideCard'
import { card, dangerButton, pageTitle, primaryButton, secondaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'
import type { OfferStatus } from '../../types'

const offerText: Record<OfferStatus, string> = {
  PENDING: 'Waiting for answer',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'No answer',
}

// Free options staff can try when no driver accepts.
const FALLBACKS = ['Used a partner organization van', 'Gave transit directions and a bus ticket']

export function RideDetail() {
  const { id = '' } = useParams()
  const { users, refresh } = useApp()
  const ride = useData(() => dataService.getRide(id), id)
  const offers = useData(() => dataService.listOffersForRide(id), id) ?? []
  const drivers = useData(() => dataService.listDrivers()) ?? []
  const facilities = useData(() => dataService.listFacilities()) ?? []

  if (!ride) return <p>Ride not found.</p>

  const driver = drivers.find((d) => d.id === ride.driverId)
  const driverUser = users.find((u) => u.id === driver?.userId)
  const facility = facilities.find((f) => f.id === ride.facilityId)
  const driverName = (driverId: string) =>
    users.find((u) => u.id === drivers.find((d) => d.id === driverId)?.userId)?.name ?? 'Driver'
  const canCancel = !['COMPLETED', 'CANCELLED', 'PICKED_UP'].includes(ride.status)

  async function cancel(reason: string) {
    await dataService.cancelRide(ride!.id, reason)
    refresh()
  }

  async function retry() {
    await dataService.retryRide(ride!.id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <h1 className={`${pageTitle} no-print`}>Ride for {ride.clientName}</h1>
      <div className="no-print">
        <RideCard ride={ride} />
      </div>

      {ride.status === 'NEEDS_ATTENTION' && (
        <section className={`${card} no-print border-2 border-red-500`}>
          <h2 className="mb-2 text-xl font-bold text-red-800">No driver accepted this ride</h2>
          <p className="mb-4">Try asking drivers again, or use a free fallback:</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primaryButton} onClick={retry}>
              Ask drivers again
            </button>
            {FALLBACKS.map((f) => (
              <button key={f} type="button" className={secondaryButton} onClick={() => cancel(f)}>
                {f}
              </button>
            ))}
          </div>
        </section>
      )}

      {(ride.status === 'ACCEPTED' || ride.status === 'PICKED_UP') && (
        <section className="space-y-3">
          <ClientSlip ride={ride} driver={driver} driverUser={driverUser} facility={facility} />
          <button type="button" className={`${secondaryButton} no-print`} onClick={() => window.print()}>
            Print slip for client
          </button>
        </section>
      )}

      <section className={`${card} no-print`}>
        <h2 className="mb-3 text-xl font-bold">Drivers asked</h2>
        {offers.length === 0 && <p>No drivers asked yet.</p>}
        <ul className="space-y-1">
          {offers.map((o) => (
            <li key={o.id}>
              {driverName(o.driverId)}: <strong>{offerText[o.status]}</strong>
            </li>
          ))}
        </ul>
      </section>

      {ride.cancelReason && <p className="no-print">Closed: {ride.cancelReason}</p>}

      {canCancel && (
        <button type="button" className={`${dangerButton} no-print`} onClick={() => cancel('Cancelled by staff')}>
          Cancel ride
        </button>
      )}

      {/* TODO: show group ride suggestions (logic/groupRides.ts) */}
    </div>
  )
}
