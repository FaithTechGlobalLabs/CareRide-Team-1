import { useNavigate, useParams } from 'react-router-dom'
import { ClientSlip } from '../../components/ClientSlip'
import { RideCard } from '../../components/RideCard'
import { card, dangerButton, pageTitle, primaryButton, secondaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'
import type { OfferStatus, RideStatus } from '../../types'

const offerText: Record<OfferStatus, string> = {
  PENDING: 'Waiting for answer',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'No answer',
}

// Free options the house can try when no driver accepts.
const FALLBACKS = ['Used a partner organization van', 'Gave transit directions and a bus ticket']

const CAN_CANCEL: RideStatus[] = ['SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION']
const CAN_BOOK_RETURN: RideStatus[] = ['ACCEPTED', 'PICKED_UP', 'COMPLETED']

export function RideDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { users, refresh } = useApp()
  const ride = useData(() => dataService.getRide(id), id)
  const offers = useData(() => dataService.listOffersForRide(id), id) ?? []
  const drivers = useData(() => dataService.listDrivers()) ?? []
  const houses = useData(() => dataService.listHouses()) ?? []

  if (!ride) return <p>Ride not found.</p>

  const driver = drivers.find((d) => d.id === ride.driverId)
  const driverUser = users.find((u) => u.id === driver?.userId)
  const house = houses.find((h) => h.id === ride.houseId)
  const driverName = (driverId: string) =>
    users.find((u) => u.id === drivers.find((d) => d.id === driverId)?.userId)?.name ?? 'Driver'

  async function cancel(reason: string) {
    await dataService.cancelRide(id, reason)
    refresh()
  }

  async function retry() {
    await dataService.retryRide(id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <h1 className={`${pageTitle} no-print`}>Ride to {ride.destinationName}</h1>
      <div className="no-print">
        <RideCard ride={ride} from={ride.returnOfRideId ? undefined : house?.name} />
      </div>

      {ride.status === 'NEEDS_ATTENTION' && (
        <section className={`${card} no-print border-2 border-red-500`}>
          <h2 className="mb-2 text-xl font-bold text-red-800">No driver accepted this ride</h2>
          <p className="mb-4">Try asking drivers again, or use a free fallback:</p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button type="button" className={primaryButton} onClick={retry}>
              Ask drivers again
            </button>
            {FALLBACKS.map((f) => (
              <button key={f} type="button" className={`${secondaryButton} py-3 text-center`} onClick={() => cancel(f)}>
                <span className="whitespace-normal">{f}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(ride.status === 'ACCEPTED' || ride.status === 'PICKED_UP') && (
        <section className="space-y-3">
          <p className="no-print">Remind the client about their ride. Print this slip if it helps.</p>
          <ClientSlip ride={ride} driver={driver} driverUser={driverUser} house={house} />
          <button type="button" className={`${secondaryButton} no-print w-full sm:w-auto`} onClick={() => window.print()}>
            Print slip
          </button>
        </section>
      )}

      {ride.status === 'COMPLETED' && ride.completedAt && (
        <p className="no-print font-semibold text-green-800">
          Arrived. The driver confirmed drop-off at {new Date(ride.completedAt).toLocaleTimeString()}.
        </p>
      )}

      {ride.cancelReason && <p className="no-print">Closed: {ride.cancelReason}</p>}

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

      <div className="no-print grid gap-3 sm:flex sm:flex-wrap">
        {!ride.returnOfRideId && CAN_BOOK_RETURN.includes(ride.status) && (
          <button type="button" className={secondaryButton} onClick={() => navigate(`/house/request?returnOf=${ride.id}`)}>
            Book the return trip
          </button>
        )}
        {CAN_CANCEL.includes(ride.status) && (
          <button type="button" className={dangerButton} onClick={() => cancel('Cancelled by the house')}>
            Cancel ride
          </button>
        )}
      </div>

      {/* TODO: show group ride suggestions (logic/groupRides.ts) */}
    </div>
  )
}
