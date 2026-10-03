import type { Driver, House, Ride, User } from '../types'

interface Props {
  ride: Ride
  driver?: Driver
  driverUser?: User
  house?: House
}

// Large-text printable reminder for clients without a phone.
export function ClientSlip({ ride, driver, driverUser, house }: Props) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-400 bg-white p-6 text-xl leading-relaxed">
      <h2 className="mb-4 text-2xl font-bold">Your ride</h2>
      {ride.clientName && (
        <p>
          <strong>Name:</strong> {ride.clientName}
        </p>
      )}
      <p>
        <strong>When:</strong> {ride.type === 'ON_DEMAND' ? 'On demand' : new Date(ride.pickupTime).toLocaleString()}
      </p>
      <p>
        <strong>Where to wait:</strong> {ride.pickupInstructions ?? ride.pickupAddress}
      </p>
      <p>
        <strong>Going to:</strong> {ride.destinationName}
      </p>
      <p>
        <strong>Driver:</strong> {driverUser?.name ?? 'To be confirmed'}
      </p>
      <p>
        <strong>Car:</strong> {driver?.vehicle ?? 'To be confirmed'}
      </p>
      <p className="mt-4 font-semibold">Please be ready on time. If you miss the ride, it can't wait for you.</p>
      <p className="mt-2">
        <strong>Questions?</strong> Call {house ? `${house.name} at ${house.phone}` : 'your house'}
      </p>
    </div>
  )
}
