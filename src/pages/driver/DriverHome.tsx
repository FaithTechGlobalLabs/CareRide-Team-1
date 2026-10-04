import { BellRing, CalendarCheck, CalendarClock, ChevronDown, History, Hourglass, Navigation, PiggyBank, Settings2, Trophy, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardHeader } from '../../components/dashboard/DashboardHeader'
import { StatTile } from '../../components/dashboard/StatTile'
import { DriverTripActions } from '../../components/DriverTripActions'
import { OfferCard } from '../../components/OfferCard'
import { RequestStatusCard } from '../../components/RequestStatusCard'
import { RideCard } from '../../components/RideCard'
import { RideCelebration } from '../../components/RideCelebration'
import { card, secondaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useCurrentDriver } from '../../hooks/useCurrent'
import { useData } from '../../hooks/useData'
import { useNow } from '../../hooks/useNow'
import { canUndoFinish } from '../../logic/dispatch'
import { formatDollars } from '../../logic/estimateFare'
import { countdown, startOfWeek } from '../../logic/rideInsights'
import { driverRideStatusLabel } from '../../logic/rideText'
import { dataService } from '../../services'
import type { Ride } from '../../types'

const PAST_PAGE = 10

const sectionTitle = 'mb-3 flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-ink'

// The driver started this trip, so it's the one to show first.
const inProgress = (r: Ride) => r.status === 'PICKED_UP' || !!r.driverOnTheWayAt || !!r.driverArrivedAt

const finishedAt = (r: Ride) => r.completedAt ?? r.cancelledAt ?? r.pickupTime

// Requests and accepted rides in one place: what's new, what's now, what's next, and what's done.
function scrollToId(id: string) {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
}

export function DriverHome() {
  const { currentUser, refresh } = useApp()
  const now = useNow()
  const driver = useCurrentDriver()
  const driverId = driver?.id ?? ''
  const houses = useData(() => dataService.listHouses()) ?? []
  const rides = useData(() => dataService.listMyRides(driverId), driverId)
  const offers = useData(async () => {
    const pending = await dataService.listMyOffers(driverId)
    const found = await Promise.all(pending.map((o) => dataService.getRide(o.rideId)))
    return pending.flatMap((offer, i) => (found[i] ? [{ offer, ride: found[i] }] : []))
  }, driverId)
  const [celebrate, setCelebrate] = useState<Ride>()
  const [pastShown, setPastShown] = useState(PAST_PAGE)

  if (!driver) return <p>No driver profile found.</p>
  if (driver.status !== 'APPROVED') {
    return (
      <div className={`${card} mx-auto max-w-xl p-8 text-center`}>
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-amber-600" aria-hidden>
          <Hourglass className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">We're checking your documents</h1>
        <p className="mt-2 text-slate-600">
          The CareRide team reviews every driver before the first ride. Once you're approved, requests that fit your settings will show up right here.
        </p>
      </div>
    )
  }

  const houseOf = (r: Ride) => houses.find((h) => h.id === r.houseId)
  const pickupArea = (r: Ride) => {
    const house = houseOf(r)
    return house && `${house.name}, ${house.city}`
  }

  async function respond(offerId: string, accept: boolean) {
    try {
      await dataService.respondToOffer(offerId, accept)
    } catch (err) {
      alert((err as Error).message)
    }
    refresh()
  }

  async function undoFinish(ride: Ride) {
    try {
      await dataService.undoDriverStep(ride.id, driverId)
    } catch (err) {
      alert((err as Error).message)
    }
    refresh()
  }

  const active = (rides ?? [])
    .filter((r) => r.status === 'ACCEPTED' || r.status === 'PICKED_UP')
    .sort((a, b) => Number(inProgress(b)) - Number(inProgress(a)) || a.pickupTime.localeCompare(b.pickupTime))
  const [current, ...upcoming] = active
  const past = (rides ?? []).filter((r) => r.status === 'COMPLETED' || r.status === 'NO_SHOW').sort((a, b) => finishedAt(b).localeCompare(finishedAt(a)))

  const tripActions = (r: Ride, showMap = false) => (
    <DriverTripActions
      ride={r}
      house={houseOf(r)}
      driverId={driverId}
      onDone={refresh}
      onCompleted={setCelebrate}
      showMap={showMap}
    />
  )

  const completed = past.filter((r) => r.status === 'COMPLETED')
  const weekStart = startOfWeek(now)
  const thisWeek = completed.filter((r) => new Date(finishedAt(r)).getTime() >= weekStart).length
  const faresSaved = completed.reduce((sum, r) => sum + r.estimatedFareSaved, 0)
  const offerCount = offers?.length ?? 0

  // One sentence on what to do next, most urgent first
  const summary =
    offerCount > 0
      ? `${offerCount} new ${offerCount === 1 ? 'request is' : 'requests are'} waiting for you.`
      : current && inProgress(current)
        ? `You're on a trip to ${current.destinationName}.`
        : current
          ? `Your next ride is ${current.type === 'ON_DEMAND' ? 'as soon as you can' : countdown(new Date(current.pickupTime).getTime(), now)}, to ${current.destinationName}.`
          : 'No rides right now. New requests show up here on their own.'

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <DashboardHeader
          name={currentUser?.name ?? 'driver'}
          summary={summary}
          actions={
            <Link to="/driver/settings" className={`${secondaryButton} min-h-12`}>
              <Settings2 className="h-5 w-5" aria-hidden />
              Hours and vehicle
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="New requests"
            value={offerCount}
            icon={<BellRing className="h-5 w-5" />}
            tone="teal"
            note={offerCount ? 'Tap to see them' : 'All caught up'}
            onClick={() => scrollToId('requests-title')}
            actionLabel="Go to new requests"
          />
          <StatTile
            label="Accepted"
            value={active.length}
            icon={<CalendarCheck className="h-5 w-5" />}
            tone="brand"
            note={active.length ? 'Rides on your list' : 'None yet'}
            onClick={() => scrollToId('current-title')}
            actionLabel="Go to your accepted rides"
          />
          <StatTile label="Rides given" value={completed.length} icon={<Trophy className="h-5 w-5" />} tone="ink" note={`${thisWeek} this week`} />
          <StatTile
            label="Bus fares saved"
            value={formatDollars(faresSaved)}
            icon={<PiggyBank className="h-5 w-5" />}
            tone="coral"
            note="For the people you drove"
          />
        </div>
      </div>
      <RequestStatusCard driver={driver} showSettingsLink />

      <section aria-labelledby="requests-title">
        <h2 id="requests-title" className={`${sectionTitle} scroll-mt-28`}>
          <BellRing className="h-5 w-5 text-teal-600" aria-hidden />
          New requests
          {!!offers?.length && <span className="rounded-full bg-coral-700 px-2 py-0.5 text-sm font-bold text-white">{offers.length}</span>}
        </h2>
        {offers?.length === 0 && <p className="text-slate-600">No requests right now. New ones show up here on their own. Decline any that don't suit you.</p>}
        <div className="space-y-3">
          {offers?.map(({ offer, ride }) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              ride={ride}
              from={ride.returnOfRideId ? undefined : pickupArea(ride)}
              changed={ride.reconfirmDriverId === driverId}
              fromMe
              onRespond={(accept) => respond(offer.id, accept)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="current-title">
        <h2 id="current-title" className={`${sectionTitle} scroll-mt-28`}>
          <Navigation className="h-5 w-5 text-brand-600" aria-hidden />
          {current && inProgress(current) ? 'Your trip now' : 'Next ride'}
        </h2>
        {!current && <p className="text-slate-600">No accepted rides. When you accept a request, it shows up here.</p>}
        {current && (
          <RideCard ride={current} from={houseOf(current)?.name} statusLabel={driverRideStatusLabel(current)}>
            {tripActions(current, true)}
          </RideCard>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" className={sectionTitle}>
            <CalendarClock className="h-5 w-5 text-brand-600" aria-hidden />
            Coming up
          </h2>
          <div className="space-y-3">
            {upcoming.map((r) => (
              <RideCard key={r.id} ride={r} from={houseOf(r)?.name} statusLabel={driverRideStatusLabel(r)}>
                <details className="group w-full">
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-semibold text-brand-700 marker:content-none [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="h-5 w-5 transition group-open:rotate-180" aria-hidden />
                    Pickup details and steps
                  </summary>
                  <div className="mt-3">{tripActions(r)}</div>
                </details>
              </RideCard>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="past-title">
        <h2 id="past-title" className={`${sectionTitle} scroll-mt-28`}>
          <History className="h-5 w-5 text-slate-500" aria-hidden />
          Past rides
        </h2>
        {past.length === 0 && <p className="text-slate-600">No past rides yet.</p>}
        <div className="space-y-3">
          {past.slice(0, pastShown).map((r) => (
            <RideCard key={r.id} ride={r} from={houseOf(r)?.name}>
              {canUndoFinish(r) && (
                <button
                  type="button"
                  onClick={() => undoFinish(r)}
                  className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-ink"
                >
                  <Undo2 className="h-4 w-4" aria-hidden />
                  {r.status === 'COMPLETED' ? 'Undo the drop-off' : 'Undo “didn’t show”'}
                </button>
              )}
            </RideCard>
          ))}
        </div>
        {past.length > pastShown && (
          <button type="button" className={`${secondaryButton} mt-4`} onClick={() => setPastShown((n) => n + PAST_PAGE)}>
            Show older rides
          </button>
        )}
      </section>

      {celebrate && <RideCelebration ride={celebrate} onClose={() => setCelebrate(undefined)} onUndo={() => undoFinish(celebrate)} />}
    </div>
  )
}
