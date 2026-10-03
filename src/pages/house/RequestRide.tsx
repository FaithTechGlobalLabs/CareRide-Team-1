import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  DoorOpen,
  Ellipsis,
  HandHelping,
  HeartHandshake,
  House as HouseIcon,
  IdCard,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
  Stethoscope,
  TriangleAlert,
  User as UserIcon,
  Zap,
} from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FormSection } from '../../components/booking/FormSection'
import { MatchLine } from '../../components/booking/MatchLine'
import { OptionTile } from '../../components/booking/OptionTile'
import { PassengerStepper } from '../../components/booking/PassengerStepper'
import { TripSummary } from '../../components/booking/TripSummary'
import { FieldMessage } from '../../components/form/FieldMessage'
import { RequiredMark } from '../../components/form/RequiredMark'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { input, label, primaryButton } from '../../components/ui'
import { DEFAULT_PICKUP_INSTRUCTIONS, PURPOSE_LABELS } from '../../constants'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { previewDriverMatch } from '../../logic/driverMatchPreview'
import { estimateFare } from '../../logic/estimateFare'
import { HOME_FOR, ridePath } from '../../logic/homeFor'
import { describePickup, quickPicks, toLocalInput } from '../../logic/pickupTime'
import { sortByPopularity } from '../../logic/popularDestinations'
import { dataService } from '../../services'
import type { RideType, TripPurpose } from '../../types'

const CUSTOM = 'custom'

// Past this many saved places, a search box helps staff find theirs.
const SEARCH_AFTER = 6

const PURPOSE_ICONS: Record<TripPurpose, ReactNode> = {
  MEDICAL: <Stethoscope className="h-4 w-4" />,
  SOCIAL_SERVICES: <HeartHandshake className="h-4 w-4" />,
  HOUSING: <HouseIcon className="h-4 w-4" />,
  LEGAL_OR_ID: <IdCard className="h-4 w-4" />,
  OTHER: <Ellipsis className="h-4 w-4" />,
}

type Field = 'destination' | 'customAddress' | 'pickupTime' | 'clientName'

// Where each required field lives, in page order, so a failed send jumps to the first one missing.
const FIELD_TARGETS: Record<Field, { section: string; focus: string }> = {
  destination: { section: 'where', focus: 'input[name="destination"]' },
  customAddress: { section: 'where', focus: '#custom-address' },
  pickupTime: { section: 'when', focus: '#pickup-time' },
  clientName: { section: 'who', focus: '#client-name' },
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

function jumpTo(field: Field) {
  const { section, focus } = FIELD_TARGETS[field]
  document.getElementById(section)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  document.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true })
}

// One-way trip. With ?returnOf=<rideId>, books the trip back to the house instead.
// A house books for itself; an organization admin picks which of its houses the ride is for.
export function RequestRide() {
  const { currentUser, refresh } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnOf = params.get('returnOf') ?? ''
  const isOrg = currentUser?.role === 'ORG_ADMIN'

  const houses = useData(() => dataService.listHouses(currentUser?.orgId), currentUser?.orgId)
  const outbound = useData(() => (returnOf ? dataService.getRide(returnOf) : Promise.resolve(undefined)), returnOf)
  const [pickedHouseId, setPickedHouseId] = useState('')
  const houseId = outbound?.houseId ?? (isOrg ? pickedHouseId || houses?.[0]?.id : currentUser?.houseId) ?? ''
  const house = houses?.find((h) => h.id === houseId)
  const pastRides = useData(() => dataService.listRidesForHouse(houseId), houseId) ?? []
  const destinations = useData(() => dataService.listDestinations(currentUser?.orgId), currentUser?.orgId) ?? []
  const drivers = useData(() => dataService.listDrivers())
  const sorted = sortByPopularity(destinations, pastRides, houseId)

  // When the form was opened. The default and earliest pickup times are based on it.
  const [openedAt] = useState(() => Date.now())
  const picks = quickPicks(openedAt)

  const [type, setType] = useState<RideType>('SCHEDULED')
  const [purpose, setPurpose] = useState<TripPurpose>('MEDICAL')
  const [clientName, setClientName] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [destinationId, setDestinationId] = useState('')
  const [customAddress, setCustomAddress] = useState('')
  const [query, setQuery] = useState('')
  const [pickupTime, setPickupTime] = useState(() => picks[0].value)
  const [pickupInstructions, setPickupInstructions] = useState(DEFAULT_PICKUP_INSTRUCTIONS)
  const [needsWheelchair, setNeedsWheelchair] = useState(false)
  const [needsAssistance, setNeedsAssistance] = useState(false)
  const [notes, setNotes] = useState('')
  // Errors stay hidden until the first send, then update live as staff fix them.
  const [showErrors, setShowErrors] = useState(false)
  // The clock the pickup time is checked against. Moves forward on each send.
  const [checkedAt, setCheckedAt] = useState(openedAt)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)

  if (!houses || (returnOf && !outbound)) return null
  if (!house || !currentUser) {
    return isOrg ? (
      <p>
        Add a house first, so drivers know where to pick clients up.{' '}
        <Link to="/org/houses" className="font-semibold text-brand-700 underline underline-offset-2">
          Add a house
        </Link>
      </p>
    ) : (
      <p>This account isn't linked to a house.</p>
    )
  }

  const pickupMs = Date.parse(pickupTime)
  const pickupValid = !Number.isNaN(pickupMs)

  function validate(now: number): Partial<Record<Field, string>> {
    const found: Partial<Record<Field, string>> = {}
    if (!outbound && !destinationId) found.destination = 'Choose where the client is going.'
    if (!outbound && destinationId === CUSTOM && !customAddress.trim()) found.customAddress = 'Type the address the client is going to.'
    if (type === 'SCHEDULED') {
      if (!pickupValid) found.pickupTime = 'Choose a pickup date and time.'
      else if (pickupMs < now) found.pickupTime = 'That time has already passed. Choose a later time.'
    }
    if (!clientName.trim()) found.clientName = "Add the client's name, so the driver knows who to pick up."
    return found
  }

  const errors = validate(checkedAt)
  const shown = showErrors ? errors : {}
  const missingCount = Object.keys(errors).length

  const whereDone = !errors.destination && !errors.customAddress
  const whenDone = !errors.pickupTime
  const whoDone = !errors.clientName
  const steps = [whereDone, whenDone, whoDone, true] // the reason always has a choice
  const doneCount = steps.filter(Boolean).length

  // How many drivers could take this ride, shown before sending so staff aren't surprised.
  const pickupIso = type === 'ON_DEMAND' ? new Date(openedAt).toISOString() : pickupValid ? new Date(pickupMs).toISOString() : ''
  const match =
    drivers && pickupIso
      ? previewDriverMatch(
          { type, pickupTime: pickupIso, passengers, needsWheelchair, preferredDriverId: outbound?.driverId },
          house,
          drivers,
        )
      : undefined

  const saved = destinations.find((d) => d.id === destinationId)
  const usedBefore = new Set(pastRides.map((r) => r.destinationId))
  const q = query.trim().toLowerCase()
  const listed = q ? sorted.filter((d) => `${d.name} ${d.address}`.toLowerCase().includes(q)) : sorted

  const from = outbound ? { name: outbound.destinationName, detail: outbound.destinationAddress } : { name: house.name, detail: house.address }
  const to = outbound
    ? { name: house.name, detail: house.address }
    : saved
      ? { name: saved.name, detail: saved.address }
      : destinationId === CUSTOM && customAddress.trim()
        ? { name: customAddress.trim() }
        : undefined

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!house || !currentUser || sending) return

    // Check the pickup time against the real clock, in case the form sat open for a while.
    const now = new Date().getTime()
    setCheckedAt(now)
    setShowErrors(true)
    const firstMissing = (Object.keys(FIELD_TARGETS) as Field[]).find((f) => validate(now)[f])
    if (firstMissing) {
      jumpTo(firstMissing)
      return
    }

    const base = {
      type,
      orgId: house.orgId,
      houseId: house.id,
      requestedBy: currentUser.id,
      clientName: clientName.trim() || undefined,
      passengers,
      purpose,
      pickupTime: type === 'ON_DEMAND' ? new Date().toISOString() : new Date(pickupMs).toISOString(),
      needsWheelchair,
      needsAssistance,
      notes: notes.trim() || undefined,
      estimatedFareSaved: estimateFare(),
    }

    const destination = saved
      ? { destinationId: saved.id, destinationName: saved.name, destinationAddress: saved.address }
      : { destinationName: customAddress.trim(), destinationAddress: customAddress.trim() }

    setError('')
    setSending(true)
    try {
      const ride = outbound
        ? await dataService.requestRide({
            ...base,
            pickupAddress: outbound.destinationAddress,
            pickupInstructions: pickupInstructions || undefined,
            destinationName: house.name,
            destinationAddress: house.address,
            returnOfRideId: outbound.id,
            preferredDriverId: outbound.driverId, // ask the same driver first
          })
        : await dataService.requestRide({
            ...base,
            pickupAddress: house.address,
            pickupInstructions: pickupInstructions || undefined,
            ...destination,
          })
      refresh()
      navigate(ridePath(currentUser.role, ride.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSending(false)
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' }))
    }
  }

  const submitButton = (
    <button type="submit" className={`${primaryButton} w-full`} disabled={sending}>
      {sending ? (
        <>
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
          Sending…
        </>
      ) : (
        <>
          {outbound ? 'Book return trip' : 'Request ride'}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </>
      )}
    </button>
  )

  const missingNote = showErrors && missingCount > 0 && (
    <p className="flex items-start gap-2 text-sm font-medium text-red-700">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {missingCount === 1 ? '1 required field is' : `${missingCount} required fields are`} still empty. They're marked in red.
    </p>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-28 lg:pb-0">
      <div className="mb-6 animate-fade-up">
        <Link
          to={outbound ? ridePath(currentUser.role, outbound.id) : HOME_FOR[currentUser.role]}
          className="-ml-1 mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-slate-500 transition hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {outbound ? 'Book the return trip' : 'Request a ride'}
        </h1>
        <p className="mt-1 text-slate-600">
          {outbound ? `Bring the client home from ${outbound.destinationName}.` : 'It takes about a minute.'} Fields marked{' '}
          <span className="font-semibold text-red-600" aria-hidden>
            *
          </span>
          <span className="sr-only">with a star</span> are required.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8">
        <div className="space-y-5">
          <FormSection
            id="where"
            step={1}
            title="Where to"
            description={outbound ? 'The trip back to the house.' : 'Pick a saved place or type any address.'}
            required
            done={whereDone}
          >
            {outbound ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4 font-semibold text-ink">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand-600" aria-hidden />
                  {outbound.destinationName}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" aria-label="to" />
                <span className="inline-flex items-center gap-2">
                  <HouseIcon className="h-5 w-5 text-coral-500" aria-hidden />
                  {house.name}
                </span>
              </div>
            ) : (
              <div className="space-y-5">
                {isOrg && houses.length > 1 ? (
                  <SelectField id="house" label="Pick up from" required value={house.id} onChange={(e) => setPickedHouseId(e.target.value)}>
                    {houses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}, {h.city}
                      </option>
                    ))}
                  </SelectField>
                ) : (
                  <div>
                    <span className={label}>Pick up from</span>
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-50 text-coral-600" aria-hidden>
                        <HouseIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{house.name}</span>
                        <span className="block truncate text-sm text-slate-500">{house.address}</span>
                      </span>
                    </div>
                  </div>
                )}

                <fieldset aria-describedby="destination-message">
                  <legend className={label}>
                    Going to
                    <RequiredMark />
                  </legend>
                  {sorted.length > SEARCH_AFTER && (
                    <div className="relative mb-3">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                      <input
                        type="search"
                        className={`${input} pl-11`}
                        placeholder="Search saved places"
                        aria-label="Search saved places"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {listed.map((d) => (
                      <OptionTile
                        key={d.id}
                        name="destination"
                        checked={destinationId === d.id}
                        onChange={() => setDestinationId(d.id)}
                        title={d.name}
                        description={d.address}
                        icon={<MapPin className="h-5 w-5" />}
                        badge={usedBefore.has(d.id) ? 'Used before' : undefined}
                        invalid={!!shown.destination}
                      />
                    ))}
                    <OptionTile
                      name="destination"
                      checked={destinationId === CUSTOM}
                      onChange={() => setDestinationId(CUSTOM)}
                      title="Somewhere else"
                      description="Type any address"
                      icon={<Navigation className="h-5 w-5" />}
                      dashed
                      invalid={!!shown.destination}
                    />
                  </div>
                  {q && listed.length === 0 && (
                    <p className="mt-3 text-sm text-slate-500">No saved place matches “{query.trim()}”. Choose “Somewhere else” to type the address.</p>
                  )}
                  <FieldMessage id="destination-message" error={shown.destination} />
                </fieldset>

                {destinationId === CUSTOM && (
                  <TextField
                    id="custom-address"
                    className="animate-fade-up"
                    label="Address"
                    required
                    autoFocus
                    autoComplete="street-address"
                    icon={<MapPin className="h-5 w-5" />}
                    placeholder="e.g. 1081 Burrard St, Vancouver"
                    value={customAddress}
                    error={shown.customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                  />
                )}
              </div>
            )}
          </FormSection>

          <FormSection id="when" step={2} title="When" description="Book ahead, or find a driver now." required done={whenDone}>
            <fieldset>
              <legend className="sr-only">When does the client need the ride?</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <OptionTile
                  name="when"
                  checked={type === 'SCHEDULED'}
                  onChange={() => setType('SCHEDULED')}
                  title="Schedule for later"
                  description="Pick a date and time"
                  icon={<CalendarClock className="h-5 w-5" />}
                />
                <OptionTile
                  name="when"
                  checked={type === 'ON_DEMAND'}
                  onChange={() => setType('ON_DEMAND')}
                  title="As soon as possible"
                  description="Find a driver right now"
                  icon={<Zap className="h-5 w-5" />}
                />
              </div>
            </fieldset>

            {type === 'SCHEDULED' ? (
              <div key="scheduled" className="mt-4 animate-fade-up space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div>
                  <span className={label} id="quick-picks">
                    Quick picks
                  </span>
                  <div className="flex flex-wrap gap-2" role="group" aria-labelledby="quick-picks">
                    {picks.map((p) => {
                      const on = pickupTime === p.value
                      return (
                        <button
                          key={p.label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setPickupTime(p.value)}
                          className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 active:scale-95 ${
                            on ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/20' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <TextField
                  id="pickup-time"
                  type="datetime-local"
                  label="Pickup date and time"
                  required
                  min={toLocalInput(openedAt)}
                  value={pickupTime}
                  error={shown.pickupTime}
                  hint={pickupValid ? `Pickup: ${describePickup(pickupMs, openedAt)}` : undefined}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>
            ) : (
              <p key="now" className="mt-4 flex animate-fade-up items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                Drivers taking requests right now are asked as soon as you send this.
              </p>
            )}
          </FormSection>

          <FormSection id="who" step={3} title="Who's riding" required done={whoDone}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <TextField
                id="client-name"
                label="Client's name"
                required
                autoComplete="off"
                icon={<UserIcon className="h-5 w-5" />}
                placeholder="e.g. Sam Rivera"
                hint="So the driver knows who to pick up."
                value={clientName}
                error={shown.clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <div>
                <span id="passengers-label" className={label}>
                  People riding
                  <RequiredMark />
                </span>
                <PassengerStepper labelId="passengers-label" value={passengers} onChange={setPassengers} />
                <p className="mt-1.5 text-sm text-slate-500">Including the client.</p>
              </div>
            </div>
          </FormSection>

          <FormSection id="reason" step={4} title="Reason for the trip" required done>
            <fieldset>
              <legend className="sr-only">Reason for the trip</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PURPOSE_LABELS) as TripPurpose[]).map((p) => {
                  const on = purpose === p
                  return (
                    <label
                      key={p}
                      className={`inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full border-2 px-4 font-semibold transition active:scale-95 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 ${
                        on ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/20' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                      }`}
                    >
                      <input type="radio" name="purpose" className="sr-only" checked={on} onChange={() => setPurpose(p)} />
                      <span aria-hidden>{PURPOSE_ICONS[p]}</span>
                      {PURPOSE_LABELS[p]}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </FormSection>

          <FormSection id="extras" step={5} title="Extra details" description="Help the driver plan a smooth ride.">
            <div className="space-y-5">
              <fieldset>
                <legend className={label}>Travel needs</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <OptionTile
                    type="checkbox"
                    checked={needsWheelchair}
                    onChange={() => setNeedsWheelchair((v) => !v)}
                    title="Wheelchair accessible"
                    description="Only accessible vehicles are asked"
                    icon={<Accessibility className="h-5 w-5" />}
                  />
                  <OptionTile
                    type="checkbox"
                    checked={needsAssistance}
                    onChange={() => setNeedsAssistance((v) => !v)}
                    title="Help getting in and out"
                    description="The driver lends a hand"
                    icon={<HandHelping className="h-5 w-5" />}
                  />
                </div>
              </fieldset>

              <TextField
                id="instructions"
                label="Where the driver meets the client"
                icon={<DoorOpen className="h-5 w-5" />}
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
              />

              <div>
                <label className={label} htmlFor="notes">
                  Notes for the driver
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className={`${input} resize-y py-3`}
                  placeholder="e.g. Uses a walker. The appointment is on the 3rd floor."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </FormSection>

          {/* TODO: suggest group rides (logic/groupRides.ts) before submitting */}
        </div>

        <aside className="animate-fade-up lg:sticky lg:top-24" style={{ animationDelay: '120ms' }} aria-label="Trip summary">
          <TripSummary
            from={from}
            to={to}
            when={type === 'ON_DEMAND' ? 'As soon as possible' : pickupValid ? describePickup(pickupMs, openedAt) : undefined}
            rider={clientName.trim() || undefined}
            passengers={passengers}
            purpose={PURPOSE_LABELS[purpose]}
            needs={[...(needsWheelchair ? ['Wheelchair'] : []), ...(needsAssistance ? ['Help in and out'] : [])]}
            done={doneCount}
            total={steps.length}
          >
            <MatchLine match={match} />
            {error && (
              <p ref={errorRef} role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-3 text-sm text-red-900">
                <strong>We couldn't send this ride.</strong> {error}
              </p>
            )}
            <div className="hidden space-y-3 lg:block">
              {missingNote}
              {submitButton}
            </div>
          </TripSummary>
        </aside>
      </div>

      {/* On phones the send button stays in reach at the bottom of the screen. */}
      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg lg:hidden">
        <div className="mx-auto max-w-5xl space-y-2">
          {missingNote}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold text-ink">
                {doneCount === steps.length ? 'Ready to send' : `${doneCount} of ${steps.length} steps done`}
              </span>
              <span className="block truncate text-slate-500">{to ? `To ${to.name}` : 'Choose a destination'}</span>
            </div>
            <div className="w-44 shrink-0">{submitButton}</div>
          </div>
        </div>
      </div>
    </form>
  )
}
