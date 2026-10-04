import type { House, Ride } from '../types'
import { formatDayTime } from '../logic/formatTime'
import { isRealAddress } from '../logic/maps'
import { riderLabel } from '../logic/rideText'

// One bus or train, and where to get off it. Later legs are transfers.
export interface TransitLeg {
  line: string
  getOffAt: string
}

interface Props {
  ride: Ride
  house?: House
  legs: TransitLeg[]
}

function blank(value?: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '________________'
}

// Large-text slip the client can hold. Staff look up the trip, then print this.
export function TransitSlip({ ride, house, legs }: Props) {
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
      {legs.length > 1 ? (
        <ol className="mt-2 space-y-2">
          {legs.map((leg, i) => (
            <li key={i}>
              <p>
                <strong>
                  {i + 1}. {i === 0 ? 'Take' : 'Then change to'}:
                </strong>{' '}
                {blank(leg.line)}
              </p>
              <p className="pl-6">
                <strong>Get off at:</strong> {blank(leg.getOffAt)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <p>
            <strong>Bus or SkyTrain:</strong> {blank(legs[0]?.line)}
          </p>
          <p>
            <strong>Get off at:</strong> {blank(legs[0]?.getOffAt)}
          </p>
        </>
      )}
      <p className="mt-4 font-semibold">Tap your Compass Ticket or card on the reader when you get on. Keep this paper with you.</p>
      <p className="mt-2">
        <strong>Questions?</strong> Call {house ? `${house.name} at ${house.phone}` : 'the front desk'}
      </p>
    </div>
  )
}
