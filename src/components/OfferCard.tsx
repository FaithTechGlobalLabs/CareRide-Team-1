import type { Ride, RideOffer } from '../types'
import { RideCard } from './RideCard'
import { primaryButton, secondaryButton } from './ui'

interface Props {
  offer: RideOffer
  ride: Ride
  onRespond: (accept: boolean) => void
}

// What a driver sees before accepting. Exact pickup details show only after accepting.
export function OfferCard({ offer, ride, onRespond }: Props) {
  return (
    <RideCard ride={{ ...ride, clientName: 'Client' }}>
      <p className="w-full text-sm text-slate-600">
        Please answer by {new Date(offer.expiresAt).toLocaleTimeString()}
      </p>
      <button type="button" className={primaryButton} onClick={() => onRespond(true)}>
        Accept
      </button>
      <button type="button" className={secondaryButton} onClick={() => onRespond(false)}>
        Decline
      </button>
    </RideCard>
  )
}
