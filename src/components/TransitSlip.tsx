import type { House, Ride } from '../types'
import { formatDayTime } from '../logic/formatTime'
import { isRealAddress } from '../logic/maps'
import { riderLabel } from '../logic/rideText'

interface Props {
  ride: Ride
  house?: House
  busLine?: string
  getOffAt?: string
}

function blank(value?: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '________________'
}

// Large-text slip the client can hold. Staff look up the trip, then print this.
export function TransitSlip({ ride, house, busLine, getOffAt }: Props) {
  const wait = ride.pickupInstructions ?? (house ? `${house.name} front desk` : ride.pickupAddress)

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-400 bg-white p-6 text-xl leading-relaxed">
      <h2 className="mb-4 text-2xl font-bold">Your bus trip</h2>
      {riderLabel(ride) && (
        <p>
          <strong>{(ride.riderNames?.filter(Boolean).length ?? 0) > 1 ? 'Names' : 'Name'}:</strong> {riderLabel(ride)}
        </p>
      )}
      <p>
        <strong>When:</strong> {ride.type === 'ON_DEMAND' ? 'Leave when you are ready' : formatDayTime(ride.pickupTime)}
      </p>
      <p>
        <strong>Where to wait:</strong> {wait}
      </p>
      <p>
        <strong>Going to:</strong> {ride.destinationName}
      </p>
      {isRealAddress(ride.destinationAddress) && (
        <p>
          <strong>Address:</strong> {ride.destinationAddress}
        </p>
      )}
      <p>
        <strong>Bus or SkyTrain:</strong> {blank(busLine)}
      </p>
      <p>
        <strong>Get off at:</strong> {blank(getOffAt)}
      </p>
      <p className="mt-4 font-semibold">Tap your Compass Ticket or card on the reader when you get on. Keep this paper with you.</p>
      <p className="mt-2">
        <strong>Questions?</strong> Call {house ? `${house.name} at ${house.phone}` : 'the front desk'}
      </p>
    </div>
  )
}
