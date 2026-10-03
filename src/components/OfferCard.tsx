import type { Ride, RideOffer } from '../types'
import { RideCard } from './RideCard'
import { primaryButton, secondaryButton } from './ui'
import { formatTime } from '../logic/formatTime'

interface Props {
  offer: RideOffer
  ride: Ride
  from?: string // pickup label, e.g. the house name and city
  driverName?: string // shown when a provider answers for one of its drivers
  onRespond: (accept: boolean) => void
}

// What a driver sees before accepting. Exact pickup details show only after accepting.
export function OfferCard({ offer, ride, from, driverName, onRespond }: Props) {
  return (
    <RideCard ride={ride} from={from}>
      <p className="w-full text-sm text-slate-600">
        {driverName && <>For {driverName} · </>}
        Please answer by {formatTime(offer.expiresAt)}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <button type="button" className={primaryButton} onClick={() => onRespond(true)}>
          Accept
        </button>
        <button type="button" className={secondaryButton} onClick={() => onRespond(false)}>
          Decline
        </button>
      </div>
    </RideCard>
  )
}
