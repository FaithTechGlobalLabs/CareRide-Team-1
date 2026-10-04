import {
  ArrowLeft,
  Bus,
  CalendarClock,
  CarFront,
  Check,
  CircleCheckBig,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Repeat,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ClientSlip } from '../../components/ClientSlip'
import { ConfirmButton } from '../../components/ConfirmButton'
import { RideCard } from '../../components/RideCard'
import { TransitSlip, type TransitLeg } from '../../components/TransitSlip'
import { card, dangerButton, ghostButton, input, label, pageTitle, primaryButton, secondaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { acceptedMessage } from '../../logic/acceptedMessage'
import { noDriverDeadline } from '../../logic/dispatch'
import { previewDriverMatch } from '../../logic/driverMatchPreview'
import { driverEtaDetail } from '../../logic/driverEta'
import { formatDayTime, formatTime } from '../../logic/formatTime'
import { directionsBetween, directionsTo, isRealAddress } from '../../logic/maps'
import { isDriverLate, wasDropped } from '../../logic/rideAlerts'
import { isSentOnTransit, TRANSIT_PASS_REASON, TRANSIT_TICKET_REASON } from '../../logic/rideText'
import { dataService } from '../../services'
import type { OfferStatus, Ride, RideOffer, RideStatus } from '../../types'
import { ExternalLink } from '../../native/ExternalLink'
import { printPage } from '../../native/platform'

const offerText: Record<OfferStatus, string> = {
  PENDING: 'Waiting for answer',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'No answer',
  WITHDRAWN: 'Accepted, then cancelled',
  TAKEN: 'Another driver accepted first',
}

const CAN_CANCEL: RideStatus[] = ['SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION']
const CAN_EDIT: RideStatus[] = ['SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION']
const CAN_BOOK_RETURN: RideStatus[] = ['ACCEPTED', 'PICKED_UP', 'COMPLETED']
const HAS_DRIVER: RideStatus[] = ['ACCEPTED', 'PICKED_UP']
const BOOK_AGAIN: RideStatus[] = ['CANCELLED', 'COMPLETED', 'NO_SHOW']

// A driver can be asked twice (e.g. again after another driver drops the ride). Show their latest answer.
function latestPerDriver(offers: RideOffer[]): RideOffer[] {
  const latest = new Map<string, RideOffer>()
  for (const o of offers) if (!latest.has(o.driverId) || o.sentAt >= latest.get(o.driverId)!.sentAt) latest.set(o.driverId, o)
  return [...latest.values()]
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

interface Stage {
  label: string
  at?: string
  detail?: string
}

// Where the ride is, from booking to drop-off, so staff can see it move.
function stagesFor(ride: Ride): Stage[] {
  const eta = ride.driverEta && !ride.driverArrivedAt ? driverEtaDetail(ride) : undefined
  return [
    { label: 'Requested', at: ride.createdAt },
    { label: 'Driver accepted', at: ride.acceptedAt && ride.driverId ? ride.acceptedAt : undefined },
    { label: 'Driver on the way', at: ride.driverOnTheWayAt, detail: eta },
    { label: 'Driver at pickup', at: ride.driverArrivedAt },
    { label: 'Client picked up', at: ride.pickedUpAt ?? (ride.status === 'PICKED_UP' || ride.status === 'COMPLETED' ? ride.driverArrivedAt : undefined) },
    { label: 'Dropped off', at: ride.completedAt },
  ]
}

function RideTimeline({ ride }: { ride: Ride }) {
  const stages = stagesFor(ride)
  // How far along: the last stage with a time. A stage the driver skipped still counts as passed.
  let reached = 0
  stages.forEach((s, i) => {
    if (s.at) reached = i
  })
  const waiting = ride.status === 'SEARCHING' || ride.status === 'OFFERED'
  // Only a ride that's still going has a next step to point at
  const moving = waiting || ride.status === 'ACCEPTED' || ride.status === 'PICKED_UP'
  return (
    <section className={`${card} no-print`} aria-labelledby="timeline-title">
      <h2 id="timeline-title" className="mb-4 text-xl font-bold">
        Trip progress
      </h2>
      <ol className="relative">
        {stages.map((s, i) => {
          const done = i <= reached
          const next = i === reached + 1 && moving
          const last = i === stages.length - 1
          return (
            <li key={s.label} aria-current={i === reached ? 'step' : undefined} className="relative flex gap-3 pb-4 last:pb-0">
              {!last && (
                <span className={`absolute bottom-0 left-[11px] top-7 w-0.5 ${i < reached ? 'bg-emerald-300' : 'bg-slate-200'}`} aria-hidden />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-emerald-700 text-white' : next ? 'bg-white ring-2 ring-brand-500' : 'bg-slate-100'
                }`}
                aria-hidden
              >
                {done && <Check className="h-3.5 w-3.5" />}
                {next && <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${done ? 'text-ink' : next ? 'text-brand-800' : 'text-slate-400'}`}>
                  {s.label}
                  {next && waiting && i === 1 && <span className="font-normal text-slate-500"> · asking drivers now</span>}
                </p>
                {s.at && done && <p className="text-sm text-slate-500">{formatTime(s.at)}</p>}
                {s.detail && <p className="text-sm font-medium text-brand-700">{s.detail}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function RideDetail() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { users, refresh } = useApp()
  const ride = useData(() => dataService.getRide(id), id)
  const offers = useData(() => dataService.listOffersForRide(id), id) ?? []
  const drivers = useData(() => dataService.listDrivers()) ?? []
  const houses = useData(() => dataService.listHouses()) ?? []
  // "booked" or "changed", set by the booking form, so staff know it worked and what to do next
  const [justSaved, setJustSaved] = useState(() => (location.state as { justSaved?: 'booked' | 'changed' } | null)?.justSaved)
  const [retryNote, setRetryNote] = useState('')
  const [legs, setLegs] = useState<TransitLeg[]>([{ line: '', getOffAt: '' }])
  const transitDialog = useRef<HTMLDialogElement>(null)

  if (!ride) return <p>Ride not found.</p>

  const driver = drivers.find((d) => d.id === ride.driverId)
  const driverUser = users.find((u) => u.id === driver?.userId)
  const house = houses.find((h) => h.id === ride.houseId)
  const driverName = (driverId: string) =>
    users.find((u) => u.id === drivers.find((d) => d.id === driverId)?.userId)?.name ?? 'Driver'

  // The ride can change while this page is open (e.g. the driver picks the client up), so say why an action failed
  async function run(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (err) {
      alert((err as Error).message)
    }
    refresh()
  }

  const cancel = (reason: string) => run(() => dataService.cancelRide(id, reason))

  // Asking again only helps if some driver could say yes, so say plainly when nobody can.
  async function retry() {
    setRetryNote('')
    try {
      const after = await dataService.retryRide(id)
      if (after.status === 'NEEDS_ATTENTION' && house) {
        const match = previewDriverMatch(after, house, drivers)
        setRetryNote(
          match.count === 0 && match.reason
            ? `Still no driver can take it: ${match.reason} Change the ride, or try another option below.`
            : 'Every driver who fits has already answered. Change the ride, or try another option below.',
        )
      } else {
        setRetryNote("We're asking drivers again. You'll see it here when someone accepts.")
      }
    } catch (err) {
      setRetryNote((err as Error).message)
    }
    refresh()
  }

  const editPath = `/partner/request?edit=${ride.id}`
  const againPath = `/partner/request?again=${ride.id}`
  const canEdit = CAN_EDIT.includes(ride.status)
  // Staff are usually at the pickup, so without a pickup address on file Maps starts from where they are
  const transitLink = !isRealAddress(ride.destinationAddress)
    ? undefined
    : isRealAddress(ride.pickupAddress)
      ? directionsBetween(ride.pickupAddress, ride.destinationAddress, 'transit')
      : directionsTo(ride.destinationAddress, 'transit')
  const waiting = ride.status === 'SEARCHING' || ride.status === 'OFFERED'
  const answers = latestPerDriver(offers)
  const declined = answers.filter((o) => o.status === 'DECLINED').length
  const unanswered = answers.filter((o) => o.status === 'EXPIRED').length
  const noMatchReason = house && answers.length === 0 ? previewDriverMatch(ride, house, drivers).reason : undefined
  const noDriverWhy = [
    declined > 0 && `${declined === 1 ? '1 driver' : `${declined} drivers`} said no.`,
    unanswered > 0 && `${unanswered === 1 ? '1 driver' : `${unanswered} drivers`} didn't answer in time.`,
    answers.length === 0 ? (noMatchReason ? `No driver fits it: ${noMatchReason}` : 'No driver fits it.') : 'Nobody else can be asked.',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          to="/partner"
          className="-ml-1 mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-slate-500 transition hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to your rides
        </Link>
        <h1 className={`${pageTitle} mb-0`}>Ride to {ride.destinationName}</h1>
      </div>

      {justSaved && (
        <section role="status" className="no-print animate-fade-up rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 text-emerald-900">
          <div className="flex items-start gap-3">
            <CircleCheckBig className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{justSaved === 'booked' ? 'Ride requested' : 'Changes saved'}</h2>
              <p className="mt-1">
                {ride.status === 'ACCEPTED'
                  ? acceptedMessage(ride, driverUser?.name)
                  : ride.status === 'NEEDS_ATTENTION'
                    ? 'No driver can take it as it is. See the options below.'
                    : "We're asking drivers now. This page updates when someone accepts."}
              </p>
              <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                <Link to="/partner" className={primaryButton}>
                  Back to dashboard
                </Link>
                <Link to="/partner/request" className={secondaryButton}>
                  <Plus className="h-5 w-5" aria-hidden />
                  Book another ride
                </Link>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setJustSaved(undefined)}
              aria-label="Dismiss"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-emerald-800 hover:bg-emerald-100"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </section>
      )}

      <div className="no-print">
        <RideCard ride={ride} from={ride.returnOfRideId ? undefined : house?.name}>
          {HAS_DRIVER.includes(ride.status) && driverUser && (
            <>
              <p className="w-full">
                <strong>Driver:</strong> {driverUser.name}
                {driver && (
                  <>
                    <br />
                    <strong>Car:</strong> {driver.vehicle}
                  </>
                )}
              </p>
              <ExternalLink href={telHref(driverUser.phone)} className={`${secondaryButton} w-full sm:w-auto`}>
                <Phone className="h-5 w-5" aria-hidden />
                <span className="whitespace-normal">
                  Call {driverUser.name}: <span className="whitespace-nowrap">{driverUser.phone}</span>
                </span>
              </ExternalLink>
            </>
          )}
          {canEdit && (
            <Link to={editPath} className={`${secondaryButton} w-full sm:w-auto`}>
              <Pencil className="h-5 w-5" aria-hidden />
              Change details
            </Link>
          )}
        </RideCard>
        {ride.changedAt && canEdit && (
          <p className="mt-2 text-sm text-slate-500">Changed at {formatTime(ride.changedAt)}.</p>
        )}
      </div>

      {ride.status === 'ACCEPTED' && ride.driverArrivedAt && (
        <section className="no-print rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 text-emerald-900" role="status">
          <h2 className="text-2xl font-bold">Driver is here ({formatTime(ride.driverArrivedAt)})</h2>
          <p className="mt-1">Send the client down to meet them.</p>
        </section>
      )}

      {isDriverLate(ride) && (
        <section role="alert" className={`${card} no-print border-2 border-red-500 bg-red-50 text-red-900`}>
          <h2 className="text-xl font-bold">⚠ The driver hasn't arrived yet</h2>
          <p className="mt-1">Pickup was at {formatTime(ride.pickupTime)}. Give them a call.</p>
        </section>
      )}

      {driver && HAS_DRIVER.includes(ride.status) && !ride.driverArrivedAt && (
        <section className="no-print flex items-start gap-4 rounded-xl border-2 border-brand-300 bg-brand-50 p-6" role="status">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600" aria-hidden>
            <CarFront className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-brand-900">
              {acceptedMessage(ride, driverUser?.name)}
            </h2>
            <p className="text-brand-800">{driver.vehicle}</p>
          </div>
        </section>
      )}

      {wasDropped(ride) && ride.droppedBy && (
        <section role="alert" className={`${card} no-print border-2 border-red-500 bg-red-50 text-red-900`}>
          <h2 className="text-xl font-bold">⚠ {driverName(ride.droppedBy.driverId)} can no longer take this ride</h2>
          <p className="mt-1">
            {ride.status === 'NEEDS_ATTENTION' ? '' : "We're finding another driver. "}If you printed a slip, it's out of date.
          </p>
          <p className="mt-1 text-sm">They cancelled at {formatTime(ride.droppedBy.at)}.</p>
        </section>
      )}

      {ride.reconfirmDriverId && waiting && (
        <p role="status" className="no-print flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
          <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          You changed the ride, so we've asked {driverName(ride.reconfirmDriverId)} to confirm the new details first.
        </p>
      )}

      {waiting && (
        <p className="no-print text-slate-600">
          If no driver accepts by {formatDayTime(noDriverDeadline(ride).toISOString())}, we'll cancel the request so you can make other
          plans.
        </p>
      )}

      {ride.status === 'NEEDS_ATTENTION' && (
        <section className={`${card} no-print border-2 border-red-500`} aria-labelledby="no-driver-title">
          <h2 id="no-driver-title" className="mb-1 text-xl font-bold text-red-800">
            No driver is available for this ride
          </h2>
          <p className="mb-4 text-slate-700">{noDriverWhy}</p>
          {retryNote && (
            <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              {retryNote}
            </p>
          )}
          <ul className="space-y-3">
            <li className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-semibold">Ask drivers again</p>
                <p className="text-sm text-slate-600">Sends the request to every driver who fits, including those who said no.</p>
              </div>
              <button type="button" className={primaryButton} onClick={retry}>
                <RefreshCw className="h-5 w-5" aria-hidden />
                Ask again
              </button>
            </li>
            <li className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-semibold">Change the time or details</p>
                <p className="text-sm text-slate-600">A different time or fewer passengers may suit more drivers.</p>
              </div>
              <Link to={editPath} className={secondaryButton}>
                <CalendarClock className="h-5 w-5" aria-hidden />
                Change the ride
              </Link>
            </li>
            <li className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
              {ride.needsWheelchair && (
                <p role="status" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  This trip needs a wheelchair. Transit may not work. Ask drivers again or change the time first.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-semibold">Send on transit</p>
                  <p className="text-sm text-slate-600">
                    Look up the trip, print the slip, give a Compass Ticket or check they have a pass, then mark them sent.
                  </p>
                </div>
                <div className="grid gap-2 sm:flex">
                  {transitLink && (
                    <ExternalLink href={transitLink} target="_blank" rel="noreferrer" className={secondaryButton}>
                      <Bus className="h-5 w-5" aria-hidden />
                      Transit directions
                      <span className="sr-only">(opens Google Maps)</span>
                    </ExternalLink>
                  )}
                  <button type="button" className={ghostButton} onClick={() => transitDialog.current?.showModal()}>
                    Mark sent on transit
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </section>
      )}

      {(ride.status === 'NEEDS_ATTENTION' || isSentOnTransit(ride)) && (
        <section className="space-y-3">
          <p className="no-print">
            Print this slip for the client. Look up the bus in directions first, then fill in the line and stop if you know them.
          </p>
          <ol className="no-print space-y-3">
            {legs.map((leg, i) => {
              const setLeg = (patch: Partial<TransitLeg>) => setLegs((all) => all.map((l, j) => (j === i ? { ...l, ...patch } : l)))
              return (
                <li key={i} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div>
                    <label className={label} htmlFor={`transit-bus-${i}`}>
                      {i === 0 ? 'Bus or SkyTrain' : `Transfer ${i}: bus or SkyTrain`}
                    </label>
                    <input
                      id={`transit-bus-${i}`}
                      className={input}
                      value={leg.line}
                      onChange={(e) => setLeg({ line: e.target.value })}
                      placeholder={i === 0 ? 'e.g. 3 Main' : 'e.g. Canada Line'}
                    />
                  </div>
                  <div>
                    <label className={label} htmlFor={`transit-stop-${i}`}>
                      Get off at
                    </label>
                    <input
                      id={`transit-stop-${i}`}
                      className={input}
                      value={leg.getOffAt}
                      onChange={(e) => setLeg({ getOffAt: e.target.value })}
                      placeholder={i === 0 ? 'e.g. Main Street–Science World' : 'e.g. Burrard Station'}
                    />
                  </div>
                  {i > 0 ? (
                    <button
                      type="button"
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                      aria-label={`Remove transfer ${i}`}
                      onClick={() => setLegs((all) => all.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </button>
                  ) : (
                    legs.length > 1 && <span className="hidden w-12 sm:block" aria-hidden />
                  )}
                </li>
              )
            })}
          </ol>
          <button
            type="button"
            className={`${ghostButton} no-print`}
            onClick={() => {
              setLegs((all) => [...all, { line: '', getOffAt: '' }])
              requestAnimationFrame(() => document.getElementById(`transit-bus-${legs.length}`)?.focus())
            }}
          >
            <Plus className="h-5 w-5" aria-hidden /> Add a transfer
          </button>
          <TransitSlip ride={ride} house={house} legs={legs} />
          <button type="button" className={`${secondaryButton} no-print w-full sm:w-auto`} onClick={() => void printPage()}>
            Print slip
          </button>
        </section>
      )}

      {ride.status !== 'CANCELLED' && <RideTimeline ride={ride} />}

      {HAS_DRIVER.includes(ride.status) && (
        <section className="space-y-3">
          <p className="no-print">Remind the client about their ride. Print this slip if it helps.</p>
          <ClientSlip ride={ride} driver={driver} driverUser={driverUser} house={house} />
          <button type="button" className={`${secondaryButton} no-print w-full sm:w-auto`} onClick={() => void printPage()}>
            Print slip
          </button>
        </section>
      )}

      {ride.status === 'CANCELLED' && (
        <section className={`${card} no-print ${isSentOnTransit(ride) ? 'border-2 border-teal-400' : ride.expired ? 'border-2 border-amber-400' : ''}`}>
          <h2 className="text-xl font-bold">
            {isSentOnTransit(ride) ? 'Sent on transit' : ride.expired ? 'This request ran out of time' : 'This ride was cancelled'}
          </h2>
          {ride.cancelReason && <p className="mt-1 text-slate-700">{ride.cancelReason}</p>}
          {isSentOnTransit(ride) && (
            <p className="mt-1 text-slate-700">No more drivers will be asked. You will not see a drop-off unless the client calls the front desk.</p>
          )}
          {ride.expired && <p className="mt-1 text-slate-700">Nobody is coming for this ride. Book it again with a new time if the client still needs it.</p>}
        </section>
      )}
      {ride.status === 'NO_SHOW' && ride.cancelReason && <p className="no-print">{ride.cancelReason}</p>}

      <section className={`${card} no-print`}>
        <h2 className="mb-3 text-xl font-bold">Drivers asked</h2>
        {offers.length === 0 && <p>No drivers asked yet.</p>}
        <ul className="space-y-1">
          {latestPerDriver(offers).map((o) => (
            <li key={o.id}>
              {driverName(o.driverId)}: <strong>{offerText[o.status]}</strong>
            </li>
          ))}
        </ul>
      </section>

      <div className="no-print grid gap-3 sm:flex sm:flex-wrap">
        {BOOK_AGAIN.includes(ride.status) && (
          <Link to={againPath} className={ride.status === 'CANCELLED' && !isSentOnTransit(ride) ? primaryButton : secondaryButton}>
            <Repeat className="h-5 w-5" aria-hidden />
            Book this ride again
          </Link>
        )}
        {!ride.returnOfRideId && (CAN_BOOK_RETURN.includes(ride.status) || isSentOnTransit(ride)) && (
          <Link to={`/partner/request?returnOf=${ride.id}`} className={secondaryButton}>
            Book the return trip
          </Link>
        )}
        {CAN_CANCEL.includes(ride.status) && (
          <ConfirmButton
            className={dangerButton}
            title="Cancel this ride?"
            body={
              ride.status === 'ACCEPTED'
                ? "It comes off the driver's list. You can book it again afterwards."
                : 'We will stop asking drivers. You can book it again afterwards.'
            }
            confirmLabel="Yes, cancel the ride"
            confirmClassName={dangerButton}
            cancelLabel="Keep the ride"
            onConfirm={() => cancel('Cancelled by the front desk.')}
          >
            Cancel ride
          </ConfirmButton>
        )}
      </div>

      <dialog
        ref={transitDialog}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl p-6 text-ink shadow-xl backdrop:bg-slate-900/50"
      >
        <h2 className="text-xl font-bold">Send them on transit?</h2>
        <p className="mt-2 text-slate-700">
          Print the slip and give a Compass Ticket, or confirm they already have a pass. No more drivers will be asked.
        </p>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            className={primaryButton}
            onClick={() => {
              transitDialog.current?.close()
              cancel(TRANSIT_TICKET_REASON)
            }}
          >
            Gave a Compass Ticket
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => {
              transitDialog.current?.close()
              cancel(TRANSIT_PASS_REASON)
            }}
          >
            They already have a pass
          </button>
          <button type="button" className={ghostButton} onClick={() => transitDialog.current?.close()}>
            Go back
          </button>
        </div>
      </dialog>

      {/* TODO: show group ride suggestions (logic/groupRides.ts) */}
    </div>
  )
}
