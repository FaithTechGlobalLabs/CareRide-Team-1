import { Check, Clock, MapPin, Navigation, Phone, Route, TriangleAlert, Undo2, UserCheck, Flag } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatTime } from '../logic/formatTime'
import { directionsBetween, directionsTo, isRealAddress } from '../logic/maps'
import { useDriverLocation } from '../hooks/useMaps'
import { ExternalLink } from '../native/ExternalLink'
import { dataService } from '../services'
import type { House, Ride } from '../types'
import { ConfirmButton } from './ConfirmButton'
import { DriveTimes } from './maps/DriveTimes'
import { RouteMap } from './maps/RouteMap'
import { dangerButton, ghostButton, primaryButton, secondaryButton } from './ui'

const ETA_CHOICES = [5, 10, 15, 20, 30]

// 0 head to pickup, 1 arrive, 2 client gets in, 3 drop off
function stepIndex(ride: Ride): number {
  if (ride.status === 'PICKED_UP') return 3
  if (ride.driverArrivedAt) return 2
  if (ride.driverOnTheWayAt) return 1
  return 0
}

interface Props {
  ride: Ride
  house?: House
  driverId: string
  onDone: () => void
  onCompleted?: (ride: Ride) => void
  showMap?: boolean // the ride the driver is on or doing next; one map per screen keeps Google Maps costs down
}

// A small "done" marker. Deliberately flat and borderless, so it never looks like something to press.
function DoneChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
      <Check className="h-4 w-4" aria-hidden />
      {children}
    </span>
  )
}

function DirectionsLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <ExternalLink href={href} target="_blank" rel="noreferrer" className={`${secondaryButton} w-full sm:w-auto`}>
      <Navigation className="h-5 w-5 text-brand-600" aria-hidden />
      {children}
      <span className="sr-only">(opens Google Maps)</span>
    </ExternalLink>
  )
}

// The trip, one step at a time. Finished steps show a tick and when they happened;
// the most recent one can be taken back. Only the current step has a big button.
export function DriverTripActions({ ride, house, driverId, onDone, onCompleted, showMap = false }: Props) {
  const [busy, setBusy] = useState(false)
  const [eta, setEta] = useState<number | undefined>(undefined)
  const current = stepIndex(ride)
  const pickupKnown = isRealAddress(ride.pickupAddress)
  const dropoffKnown = isRealAddress(ride.destinationAddress)
  const location = useDriverLocation(showMap)
  const beforePickup = current < 2

  async function run(action: () => Promise<Ride | unknown>, after?: (ride: Ride) => void) {
    setBusy(true)
    try {
      const result = await action()
      if (after && result) after(result as Ride)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
      onDone()
    }
  }

  const undo = () => run(() => dataService.undoDriverStep(ride.id, driverId))
  const undoButton = (
    <button
      type="button"
      onClick={undo}
      disabled={busy}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:opacity-50"
    >
      <Undo2 className="h-4 w-4" aria-hidden />
      Undo
    </button>
  )

  const pickupBlock = (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="flex items-start gap-2 font-semibold text-ink">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-coral-500" aria-hidden />
        <span>
          {house?.name && <span className="block">{house.name}</span>}
          <span className={house?.name ? 'block font-normal text-slate-700' : ''}>{ride.pickupAddress}</span>
        </span>
      </p>
      {ride.pickupInstructions && <p className="mt-1 pl-7 text-sm text-slate-600">{ride.pickupInstructions}</p>}
      {!pickupKnown && (
        <p className="mt-2 flex items-start gap-1.5 pl-7 text-sm font-medium text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          The exact address isn't on file yet. Call the front desk for directions.
        </p>
      )}
    </div>
  )

  const dropoffBlock = (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="flex items-start gap-2 font-semibold text-ink">
        <Flag className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
        <span>
          <span className="block">{ride.destinationName}</span>
          {ride.destinationAddress !== ride.destinationName && (
            <span className="block font-normal text-slate-700">{ride.destinationAddress}</span>
          )}
        </span>
      </p>
    </div>
  )

  const steps: { title: string; done?: ReactNode; body: ReactNode }[] = [
    {
      title: 'Head to pickup',
      done: ride.driverOnTheWayAt && (
        <DoneChip>
          Left at {formatTime(ride.driverOnTheWayAt)}
          {ride.driverEta ? ` · expected at pickup by ${formatTime(ride.driverEta)}` : ''}
        </DoneChip>
      ),
      body: (
        <div className="space-y-4">
          {pickupBlock}
          {pickupKnown && <DirectionsLink href={directionsTo(ride.pickupAddress)}>Directions to pickup</DirectionsLink>}
          <fieldset>
            <legend className="text-sm font-semibold text-ink">
              How far away are you? <span className="font-normal text-slate-500">(optional, the front desk sees it)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ETA_CHOICES.map((m) => {
                const on = eta === m
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setEta(on ? undefined : m)}
                    className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 active:scale-95 ${
                      on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                    }`}
                  >
                    {m} min
                  </button>
                )
              })}
            </div>
          </fieldset>
          <button
            type="button"
            className={`${primaryButton} w-full`}
            disabled={busy}
            onClick={() => run(() => dataService.markOnTheWay(ride.id, eta))}
          >
            <Route className="h-5 w-5" aria-hidden />
            I'm on my way{eta ? ` · ${eta} min` : ''}
          </button>
        </div>
      ),
    },
    {
      title: 'Arrive at pickup',
      done: ride.driverArrivedAt && <DoneChip>Arrived at {formatTime(ride.driverArrivedAt)}</DoneChip>,
      body: (
        <div className="space-y-4">
          {pickupBlock}
          <button
            type="button"
            className={`${primaryButton} w-full`}
            disabled={busy}
            onClick={() => run(() => dataService.markDriverArrived(ride.id))}
          >
            <MapPin className="h-5 w-5" aria-hidden />
            I'm here
          </button>
          <p className="text-sm text-slate-500">We'll let the front desk know you're outside.</p>
        </div>
      ),
    },
    {
      title: 'Client gets in',
      done: ride.pickedUpAt && <DoneChip>Picked up at {formatTime(ride.pickedUpAt)}</DoneChip>,
      body: (
        <div className="space-y-4">
          <button
            type="button"
            className={`${primaryButton} w-full`}
            disabled={busy}
            onClick={() => run(() => dataService.markPickedUp(ride.id))}
          >
            <UserCheck className="h-5 w-5" aria-hidden />
            Client is in the car
          </button>
          <ConfirmButton
            className={`${ghostButton} w-full`}
            disabled={busy}
            title="Client didn't show?"
            body="The ride ends and the front desk is told. You can undo this for 15 minutes."
            confirmLabel="Yes, client didn't show"
            confirmClassName={dangerButton}
            onConfirm={() => run(() => dataService.markNoShow(ride.id))}
          >
            Client didn't show
          </ConfirmButton>
        </div>
      ),
    },
    {
      title: 'Drop off',
      body: (
        <div className="space-y-4">
          {dropoffBlock}
          {dropoffKnown && <DirectionsLink href={directionsTo(ride.destinationAddress)}>Directions to drop-off</DirectionsLink>}
          <button
            type="button"
            className={`${primaryButton} w-full`}
            disabled={busy}
            onClick={() => run(() => dataService.markCompleted(ride.id), onCompleted)}
          >
            <Flag className="h-5 w-5" aria-hidden />
            Client dropped off
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="w-full space-y-5">
      {showMap && pickupKnown && dropoffKnown && (
        <div className="space-y-3">
          <RouteMap
            pickup={ride.pickupAddress}
            dropoff={ride.destinationAddress}
            driver={beforePickup ? location.coords : undefined}
          />
          <DriveTimes pickup={ride.pickupAddress} dropoff={ride.destinationAddress} fromMe={beforePickup} />
        </div>
      )}
      {current === 0 && pickupKnown && dropoffKnown && (
        <ExternalLink
          href={directionsBetween(ride.pickupAddress, ride.destinationAddress)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 underline underline-offset-2"
        >
          <Route className="h-4 w-4" aria-hidden />
          Preview the whole route
          <span className="sr-only">(opens Google Maps)</span>
        </ExternalLink>
      )}

      <ol className="relative" aria-label="Trip steps">
        {steps.map((step, i) => {
          const done = i < current
          const now = i === current
          const last = i === steps.length - 1
          return (
            <li key={step.title} aria-current={now ? 'step' : undefined} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && (
                <span className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} aria-hidden />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done ? 'bg-emerald-600 text-white' : now ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-100 text-slate-400'
                }`}
                aria-hidden
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3">
                  <h3 className={`font-semibold ${now ? 'text-lg text-ink' : done ? 'text-ink' : 'text-slate-400'}`}>
                    {step.title}
                    <span className="sr-only">{done ? ' (done)' : now ? ' (current step)' : ' (later)'}</span>
                  </h3>
                  {done && i === current - 1 && undoButton}
                </div>
                {done && step.done}
                {now && <div className="mt-3 animate-fade-up">{step.body}</div>}
              </div>
            </li>
          )
        })}
      </ol>

      {ride.notes && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">Note from the front desk:</span> {ride.notes}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
        {house?.phone && (
          <ExternalLink href={`tel:${house.phone}`} className={secondaryButton}>
            <Phone className="h-5 w-5" aria-hidden />
            <span className="whitespace-normal">
              Call the front desk: <span className="whitespace-nowrap">{house.phone}</span>
            </span>
          </ExternalLink>
        )}
        {ride.status === 'ACCEPTED' && (
          <ConfirmButton
            className={ghostButton}
            disabled={busy}
            title="Can't make this ride?"
            body="The front desk will see it, and we'll ask another driver."
            confirmLabel="Yes, I can't make it"
            confirmClassName={dangerButton}
            onConfirm={() => run(() => dataService.dropRide(ride.id, driverId))}
          >
            <Clock className="h-5 w-5" aria-hidden />
            I can't make it
          </ConfirmButton>
        )}
      </div>
    </div>
  )
}
