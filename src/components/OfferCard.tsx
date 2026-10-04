import { RefreshCw } from 'lucide-react'
import type { Ride, RideOffer } from '../types'
import { RideCard } from './RideCard'
import { primaryButton, secondaryButton } from './ui'
import { formatTime } from '../logic/formatTime'

interface Props {
  offer: RideOffer
  ride: Ride
  from?: string // pickup label, e.g. the partner name and city
  driverName?: string // shown when a provider answers for one of its drivers
  changed?: boolean // the driver already had this ride, and the partner changed it
  onRespond: (accept: boolean) => void
}

// What a driver sees before accepting. Exact pickup details show only after accepting.
export function OfferCard({ offer, ride, from, driverName, changed, onRespond }: Props) {
  return (
    <RideCard ride={ride} from={from}>
      {changed && (
        <p className="flex w-full items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            <strong>Changed by the front desk.</strong> You'd accepted this ride. Please check the new details and confirm
            again.
          </span>
        </p>
      )}
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
