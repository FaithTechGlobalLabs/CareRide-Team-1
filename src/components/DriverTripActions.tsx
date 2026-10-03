import { Phone } from 'lucide-react'
import { useState } from 'react'
import { formatTime } from '../logic/formatTime'
import { dataService } from '../services'
import type { House, Ride } from '../types'
import { ConfirmButton } from './ConfirmButton'
import { dangerButton, primaryButton, secondaryButton } from './ui'

const STEPS = [
  { id: 'arrive', label: 'Arrive' },
  { id: 'pickup', label: 'Pick up' },
  { id: 'dropoff', label: 'Drop off' },
] as const

function stepIndex(ride: Ride): number {
  if (ride.status === 'PICKED_UP') return 2
  if (ride.driverArrivedAt) return 1
  return 0
}

export function driverRideStatusLabel(ride: Ride): string | undefined {
  if (ride.status === 'PICKED_UP') return 'On the way'
  if (ride.status === 'ACCEPTED') return ride.driverArrivedAt ? "You're here" : 'Go to pickup'
  return undefined
}

interface Props {
  ride: Ride
  house?: House
  driverId: string
  onDone: () => void
}

export function DriverTripActions({ ride, house, driverId, onDone }: Props) {
  const [busy, setBusy] = useState(false)
  const current = stepIndex(ride)
  const arriving = ride.status === 'ACCEPTED' && !ride.driverArrivedAt
  const atPickup = ride.status === 'ACCEPTED' && Boolean(ride.driverArrivedAt)
  const enRoute = ride.status === 'PICKED_UP'

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
      onDone()
    }
  }

  return (
    <div className="w-full space-y-5">
      <ol className="flex items-center gap-2 text-sm" aria-label="Trip progress">
        {STEPS.map((step, i) => {
          const done = i < current
          const now = i === current
          return (
            <li key={step.id} aria-current={now ? 'step' : undefined} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  now ? 'bg-brand-600 text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
                aria-hidden
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`truncate font-semibold ${now ? 'text-ink' : done ? 'text-emerald-800' : 'text-slate-400'}`}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className={`h-px min-w-4 flex-1 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} aria-hidden />
              )}
            </li>
          )
        })}
      </ol>

      <dl className="space-y-3 text-base">
        <div>
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {enRoute ? 'Picked up at' : 'Now: pick up'}
          </dt>
          <dd className="font-medium text-ink">{ride.pickupAddress}</dd>
          {ride.pickupInstructions && <dd className="text-slate-600">{ride.pickupInstructions}</dd>}
        </div>
        <div>
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {enRoute ? 'Now: drop off' : 'Then drop off'}
          </dt>
          <dd className="font-medium text-ink">{ride.destinationName}</dd>
          <dd className="text-slate-600">{ride.destinationAddress}</dd>
        </div>
        {ride.notes && (
          <div>
            <dt className="text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</dt>
            <dd>{ride.notes}</dd>
          </div>
        )}
      </dl>

      {arriving && (
        <button
          type="button"
          className={`${primaryButton} w-full`}
          disabled={busy}
          onClick={() => run(() => dataService.markDriverArrived(ride.id))}
        >
          I'm here
        </button>
      )}

      {atPickup && (
        <>
          <p role="status" className="rounded-xl bg-brand-50 p-3 font-semibold text-brand-900">
            You told the house you're here at {formatTime(ride.driverArrivedAt!)}.
          </p>
          <button
            type="button"
            className={`${primaryButton} w-full`}
            disabled={busy}
            onClick={() => run(() => dataService.markPickedUp(ride.id))}
          >
            Client is in the car
          </button>
        </>
      )}

      {enRoute && (
        <button
          type="button"
          className={`${primaryButton} w-full`}
          disabled={busy}
          onClick={() => run(() => dataService.markCompleted(ride.id))}
        >
          Client arrived — tell the house
        </button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {house?.phone && (
          <a href={`tel:${house.phone}`} className={secondaryButton}>
            <Phone className="h-5 w-5" aria-hidden />
            <span className="whitespace-normal">
              Call {house.name}: <span className="whitespace-nowrap">{house.phone}</span>
            </span>
          </a>
        )}
        {ride.status === 'ACCEPTED' && (
          <details className="w-full">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 marker:content-none [&::-webkit-details-marker]:hidden">
              Pickup didn't happen
            </summary>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {atPickup && (
                <ConfirmButton
                  className={secondaryButton}
                  disabled={busy}
                  title="Client didn't show?"
                  body="The client loses this ride. It won't be rebooked."
                  confirmLabel="Yes, client didn't show"
                  confirmClassName={dangerButton}
                  onConfirm={() => run(() => dataService.markNoShow(ride.id))}
                >
                  Client didn't show
                </ConfirmButton>
              )}
              <ConfirmButton
                className={secondaryButton}
                disabled={busy}
                title="Can't make this ride?"
                body="The house will see it, and we'll ask another driver."
                confirmLabel="Yes, I can't make it"
                confirmClassName={dangerButton}
                onConfirm={() => run(() => dataService.dropRide(ride.id, driverId))}
              >
                I can't make it
              </ConfirmButton>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
