import { RefreshCw } from 'lucide-react'
import type { Ride, RideOffer } from '../types'
import { useDriverLocation } from '../hooks/useMaps'
import { RideCard } from './RideCard'
import { primaryButton, secondaryButton } from './ui'
import { formatTime } from '../logic/formatTime'
import { isRealAddress } from '../logic/maps'
import { DriveTimes } from './maps/DriveTimes'
import { RouteMap } from './maps/RouteMap'

interface Props {
  offer: RideOffer
  ride: Ride
  from?: string // pickup label, e.g. the partner name and city
  driverName?: string // shown when a provider answers for one of its drivers
  changed?: boolean // the driver already had this ride, and the partner changed it
  fromMe?: boolean // the driver is the one looking, so offer drive time from their location
  onRespond: (accept: boolean) => void
}

// What a driver sees before accepting. The route sits on the right so the trip is
// clear before they answer. The street address stays hidden until they accept.
export function OfferCard({ offer, ride, from, driverName, changed, fromMe, onRespond }: Props) {
  const pickup = isRealAddress(ride.pickupAddress) ? ride.pickupAddress : undefined
  const dropoff = isRealAddress(ride.destinationAddress) ? ride.destinationAddress : undefined
  const location = useDriverLocation(Boolean(fromMe))

  return (
    <RideCard
      ride={ride}
      from={from}
      aside={
        pickup && dropoff ? (
          <RouteMap
            pickup={pickup}
            dropoff={dropoff}
            driver={fromMe ? location.coords : undefined}
            className="order-first h-44 w-full sm:order-last sm:h-52 sm:w-72 sm:shrink-0"
          />
        ) : undefined
      }
    >
      {changed && (
        <p className="flex w-full items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            <strong>Changed by the front desk.</strong> You'd accepted this ride. Please check the new details and confirm
            again.
          </span>
        </p>
      )}
      <DriveTimes pickup={pickup} dropoff={dropoff} fromMe={fromMe} />
      <p className="w-full text-sm text-slate-600">
        {driverName && <>For {driverName} · </>}
        Please answer by {formatTime(offer.expiresAt)}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <button type="button" className={primaryButton} onClick={() => onRespond(true)}>
          {changed ? 'Keep the ride' : 'Accept'}
        </button>
        <button type="button" className={secondaryButton} onClick={() => onRespond(false)}>
          Decline
        </button>
      </div>
    </RideCard>
  )
}
