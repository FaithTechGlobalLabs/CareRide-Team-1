import type { Driver, Facility, Ride, User } from '../types'

interface Props {
  ride: Ride
  driver?: Driver
  driverUser?: User
  facility?: Facility
}

// Large-text printable confirmation for clients without a phone.
export function ClientSlip({ ride, driver, driverUser, facility }: Props) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-400 bg-white p-6 text-xl leading-relaxed">
      <h2 className="mb-4 text-2xl font-bold">Your ride</h2>
      <p>
        <strong>Driver:</strong> {driverUser?.name ?? 'To be confirmed'}
      </p>
      <p>
        <strong>Car:</strong> {driver?.vehicle ?? 'To be confirmed'}
      </p>
      <p>
        <strong>Pickup:</strong> {new Date(ride.pickupTime).toLocaleString()}
      </p>
      <p>
        <strong>From:</strong> {ride.pickupAddress}
      </p>
      <p>
        <strong>To:</strong> {ride.destinationAddress}
      </p>
      <p className="mt-4">
        <strong>Questions?</strong> Call {facility?.phone ?? 'your staff contact'}
      </p>
    </div>
  )
}
