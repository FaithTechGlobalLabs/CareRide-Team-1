import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  DoorOpen,
  HandHelping,
  History,
  House as HouseIcon,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
  TriangleAlert,
  User as UserIcon,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FormSection } from '../../components/booking/FormSection'
import { MatchLine } from '../../components/booking/MatchLine'
import { OptionTile } from '../../components/booking/OptionTile'
import { PassengerStepper } from '../../components/booking/PassengerStepper'
import { BOOK_AHEAD_DAYS, PickupTimePicker } from '../../components/booking/PickupTimePicker'
import { TripSummary } from '../../components/booking/TripSummary'
import { AddressPicker } from '../../components/form/AddressPicker'
import { FieldMessage } from '../../components/form/FieldMessage'
import { RequiredMark } from '../../components/form/RequiredMark'
import { TextField } from '../../components/form/TextField'
import { card, ghostButton, input, label, primaryButton } from '../../components/ui'
import { DEFAULT_PICKUP_INSTRUCTIONS } from '../../constants'
import { DEMO_FRAME_USER } from '../../context/demoFrame'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { useHospitalWaitTimes } from '../../hooks/useHospitalWaitTimes'
import { maxPassengers } from '../../logic/capacity'
import { ON_DEMAND_GIVE_UP_MINUTES } from '../../logic/dispatch'
import { previewDriverMatch, type MatchCheck, type MatchPreview } from '../../logic/driverMatchPreview'
import { estimateFare } from '../../logic/estimateFare'
import { ridePath } from '../../logic/homeFor'
import { matchWaitTime, waitNote, waitSummary } from '../../logic/hospitalWaitTimes'
import { houseAddress, isRealAddress } from '../../logic/maps'
import { describePickup, parseLocalInput, quickPicks, toLocalInput } from '../../logic/pickupTime'
import { sortByPopularity } from '../../logic/popularDestinations'
import { passengersLabel, riderLabel } from '../../logic/rideText'
import { MAX_NAME, MAX_NOTE, tooLong } from '../../logic/validate'
import { dataService } from '../../services'
import type { House, Ride, RideStatus, RideType, User } from '../../types'

const CUSTOM = 'custom'

// Past this many saved places, a search box helps staff find theirs.
const SEARCH_AFTER = 6

const EDITABLE: RideStatus[] = ['SEARCHING', 'OFFERED', 'NEEDS_ATTENTION', 'ACCEPTED']

// new: a fresh booking. again: a fresh booking copied from an old ride.
// return: the trip back from an outbound ride. edit: changing a booked ride.
type Mode = 'new' | 'again' | 'return' | 'edit'

interface FormState {
  type: RideType
  destinationId: string
  customAddress: string // what's in the box, then the full picked address
  customName: string // the picked place's name, e.g. a hospital, or its street address
  customPicked: boolean // picked from the search list, so it's a real place drivers can find
  pickupTime: string // datetime-local style
  passengers: number
  riderNames: string[]
  pickupInstructions: string
  needsWheelchair: boolean
  needsAssistance: boolean
  notes: string
}

type Field = 'destination' | 'customAddress' | 'pickupTime' | 'passengers' | 'riderNames' | 'pickupInstructions' | 'notes'

// Where each checked field lives, in page order, so a failed send jumps to the first problem.
const FIELD_TARGETS: Record<Field, { section: string; focus: string }> = {
  destination: { section: 'where', focus: 'input[name="destination"]' },
  customAddress: { section: 'where', focus: '#custom-address' },
  pickupTime: { section: 'when', focus: '#pickup-time' },
  passengers: { section: 'who', focus: '#passengers-label' },
  riderNames: { section: 'who', focus: '#rider-name-0' },
  pickupInstructions: { section: 'extras', focus: '#instructions' },
  notes: { section: 'extras', focus: '#notes' },
}

// Read the clock outside render, e.g. when the form is sent
const clock = () => Date.now()

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

function jumpTo(field: Field) {
  const { section, focus } = FIELD_TARGETS[field]
  document.getElementById(section)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  document.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true })
}

// ---- Unfinished bookings survive the back button, a refresh, or closing the tab

const draftKey = (userId: string) => `careride-ride-draft:${userId}`

function readDraft(userId: string): FormState | undefined {
  try {
    const raw = localStorage.getItem(draftKey(userId))
    return raw ? (JSON.parse(raw) as FormState) : undefined
  } catch {
    return undefined
  }
}

function saveDraft(userId: string, form: FormState): void {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(form))
  } catch {
    // Ignore: the draft just won't survive leaving the page
  }
}

function clearDraft(userId: string): void {
  try {
    localStorage.removeItem(draftKey(userId))
  } catch {
    // Ignore
  }
}

// Whether staff have entered anything worth keeping. The default pickup time moves with the clock, so it doesn't count.
function isUntouched(form: FormState, now: number): boolean {
  const blank = blankForm(now)
  return JSON.stringify({ ...form, pickupTime: '' }) === JSON.stringify({ ...blank, pickupTime: '' })
}

function blankForm(now: number): FormState {
  return {
    type: 'SCHEDULED',
    destinationId: '',
    customAddress: '',
    customName: '',
    customPicked: false,
    pickupTime: quickPicks(now)[0].value,
    passengers: 1,
    riderNames: [''],
    pickupInstructions: DEFAULT_PICKUP_INSTRUCTIONS,
    needsWheelchair: false,
    needsAssistance: false,
    notes: '',
  }
}

// The who and how of an earlier ride, to start a new one from
function copyRiders(ride: Ride): Pick<FormState, 'passengers' | 'riderNames' | 'needsWheelchair' | 'needsAssistance'> {
  return {
    passengers: ride.passengers,
    riderNames: Array.from({ length: ride.passengers }, (_, i) => ride.riderNames?.[i] ?? ''),
    needsWheelchair: ride.needsWheelchair,
    needsAssistance: ride.needsAssistance,
  }
}

function initialForm(mode: Mode, source: Ride | undefined, userId: string, now: number): { form: FormState; restored: boolean } {
  const blank = blankForm(now)
  if (mode === 'new') {
    const draft = readDraft(userId)
    if (!draft || isUntouched({ ...blank, ...draft }, now)) return { form: blank, restored: false }
    // A saved time that has since passed goes back to the default
    const stale = parseLocalInput(draft.pickupTime) <= now
    return { form: { ...blank, ...draft, pickupTime: stale ? blank.pickupTime : draft.pickupTime }, restored: true }
  }
  if (!source) return { form: blank, restored: false }
  // A typed address from an older ride counts as picked, unless it was never a real one
  const destination = source.destinationId
    ? { destinationId: source.destinationId, customAddress: '', customName: '', customPicked: false }
    : {
        destinationId: CUSTOM,
        customAddress: source.destinationAddress,
        customName: source.destinationName,
        customPicked: isRealAddress(source.destinationAddress),
      }
  if (mode === 'return') return { form: { ...blank, ...copyRiders(source) }, restored: false }
  if (mode === 'again') {
    return {
      form: { ...blank, ...destination, ...copyRiders(source), pickupInstructions: source.pickupInstructions ?? '', notes: source.notes ?? '' },
      restored: false,
    }
  }
  return {
    form: {
      ...destination,
      ...copyRiders(source),
      type: source.type,
      pickupTime: source.type === 'SCHEDULED' ? toLocalInput(Date.parse(source.pickupTime)) : blank.pickupTime,
      pickupInstructions: source.pickupInstructions ?? '',
      notes: source.notes ?? '',
    },
    restored: false,
  }
}

// One-way trip. ?returnOf=<id> books the trip back, ?edit=<id> changes a booked ride,
// and ?again=<id> starts a new booking from an old one.
export function RequestRide() {
  const { currentUser } = useApp()
  const [params] = useSearchParams()
  const returnOf = params.get('returnOf') ?? ''
  const editId = params.get('edit') ?? ''
  const againId = params.get('again') ?? ''
  const mode: Mode = editId ? 'edit' : returnOf ? 'return' : againId ? 'again' : 'new'
  const sourceId = editId || returnOf || againId

  const houses = useData(() => dataService.listHouses(currentUser?.orgId), currentUser?.orgId)
  // null once we know there's no such ride, so it isn't mistaken for still loading
  const source = useData(() => (sourceId ? dataService.getRide(sourceId).then((r) => r ?? null) : Promise.resolve(null)), sourceId)

  if (!currentUser || !houses || source === undefined) return null
  const house = houses.find((h) => h.id === currentUser.houseId)
  if (!house) return <p>This account has no pickup address. Ask the CareRide team to add one.</p>
  if (sourceId && !source) {
    return (
      <p>
        We couldn't find that ride.{' '}
        <Link to="/partner" className="font-semibold text-brand-700 underline underline-offset-2">
          Back to your rides
        </Link>
      </p>
    )
  }
  if (mode === 'edit' && source && !EDITABLE.includes(source.status)) {
    return (
      <div className={`${card} max-w-xl`}>
        <h1 className="text-2xl font-extrabold">This ride can't be changed anymore</h1>
        <p className="mt-2 text-slate-600">
          {source.status === 'PICKED_UP' ? 'The client is already in the car.' : 'It has already finished or been cancelled.'}
        </p>
        <Link to={ridePath(source.id)} className={`${primaryButton} mt-5`}>
          Back to the ride
        </Link>
      </div>
    )
  }

  // A fresh form whenever the kind of booking changes
  return <RideForm key={`${mode}:${sourceId}`} mode={mode} source={source ?? undefined} house={house} user={currentUser} />
}

function InlineMatchHint({ match, checks }: { match?: MatchPreview; checks: MatchCheck[] }) {
  if (!match || match.count > 0 || !match.check || !checks.includes(match.check)) return null
  return (
    <p role="status" className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-300">
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <span>
        <strong>Heads up:</strong> {match.reason}
      </span>
    </p>
  )
}

interface FormProps {
  mode: Mode
  source?: Ride
  house: House
  user: User
}

function RideForm({ mode, source, house, user }: FormProps) {
  const { refresh } = useApp()
  const navigate = useNavigate()
  const pastRides = useData(() => dataService.listRidesForHouse(house.id), house.id) ?? []
  const destinations = useData(() => dataService.listDestinations(user.orgId), user.orgId) ?? []
  // Anonymous eligibility only: enough to say how many drivers could take the ride, not who
  const drivers = useData(() => dataService.listDriverPool())
  const waits = useHospitalWaitTimes()
  const sorted = sortByPopularity(destinations, pastRides, house.id)

  // When the form was opened. The default pickup times are based on it.
  const [openedAt] = useState(() => Date.now())
  const picks = quickPicks(openedAt)
  const [initial] = useState(() => initialForm(mode, source, user.id, openedAt))
  const [form, setForm] = useState<FormState>(initial.form)
  const [restored, setRestored] = useState(initial.restored && !DEMO_FRAME_USER) // the /demo deck fills the form on purpose
  const [query, setQuery] = useState('')
  // Errors stay hidden until the first send, then update live as staff fix them.
  const [showErrors, setShowErrors] = useState(false)
  // The clock pickup times are checked against. Ticks every half minute so past times drop off the picker.
  const [now, setNow] = useState(openedAt)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  // One id per booking attempt, kept across retries, so a lost response can't book the ride twice
  const requestId = useRef(crypto.randomUUID())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (mode !== 'new') return
    if (isUntouched(form, openedAt)) clearDraft(user.id)
    else saveDraft(user.id, form)
  }, [mode, user.id, form, openedAt])

  const isReturn = mode === 'return' || (mode === 'edit' && !!source?.returnOfRideId)
  const maxRiders = drivers ? maxPassengers(drivers) : form.passengers
  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  function setPassengers(passengers: number) {
    setForm((f) => ({ ...f, passengers, riderNames: Array.from({ length: passengers }, (_, i) => f.riderNames[i] ?? '') }))
  }

  function startOver() {
    clearDraft(user.id)
    setForm(blankForm(Date.now()))
    setRestored(false)
    setShowErrors(false)
  }

  const pickupMs = parseLocalInput(form.pickupTime)
  const pickupValid = !Number.isNaN(pickupMs)

  function validate(at: number): Partial<Record<Field, string>> {
    const found: Partial<Record<Field, string>> = {}
    if (!isReturn && !form.destinationId) found.destination = 'Choose where the client is going.'
    if (!isReturn && form.destinationId === CUSTOM) {
      const address = form.customAddress.trim()
      if (!address) found.customAddress = 'Search for the address the client is going to.'
      else if (!form.customPicked) found.customAddress = 'Pick a matching address from the list, so the driver can find it.'
      else found.customAddress = tooLong(address, MAX_NAME * 2)
    }
    if (form.type === 'SCHEDULED') {
      if (!pickupValid) found.pickupTime = 'Choose a pickup date and time.'
      else if (pickupMs < at) found.pickupTime = 'That time has already passed. Choose a later time.'
      else if (pickupMs > at + BOOK_AHEAD_DAYS * 86_400_000) found.pickupTime = `Book up to ${BOOK_AHEAD_DAYS} days ahead.`
    }
    if (form.passengers > maxRiders) found.passengers = `A ride can take up to ${maxRiders} passengers. Book two rides for a bigger group.`
    if (form.riderNames.some((n) => tooLong(n, MAX_NAME))) found.riderNames = `Keep each name under ${MAX_NAME} characters.`
    found.pickupInstructions = tooLong(form.pickupInstructions, MAX_NOTE)
    found.notes = tooLong(form.notes, MAX_NOTE)
    return Object.fromEntries(Object.entries(found).filter(([, v]) => v))
  }

  const errors = validate(now)
  const shown = showErrors ? errors : {}
  const problemCount = Object.keys(errors).length

  const whereDone = !errors.destination && !errors.customAddress
  const whenDone = !errors.pickupTime
  const whoDone = !errors.passengers && !errors.riderNames
  const steps = [whereDone, whenDone, whoDone]
  const doneCount = steps.filter(Boolean).length

  // Whether any driver could take this ride, shown while filling in the form so staff aren't surprised.
  const pickupIso = form.type === 'ON_DEMAND' ? new Date(now).toISOString() : pickupValid ? new Date(pickupMs).toISOString() : ''
  const match =
    drivers && pickupIso
      ? previewDriverMatch(
          {
            type: form.type,
            pickupTime: pickupIso,
            passengers: form.passengers,
            needsWheelchair: form.needsWheelchair,
            preferredDriverId: mode === 'return' ? source?.driverId : undefined,
          },
          house,
          drivers,
        )
      : undefined

  const saved = destinations.find((d) => d.id === form.destinationId)
  const usedBefore = new Set(pastRides.map((r) => r.destinationId))
  const q = query.trim().toLowerCase()
  const listed = q ? sorted.filter((d) => `${d.name} ${d.address}`.toLowerCase().includes(q)) : sorted
  const listedWaits = listed.flatMap((d) => {
    const wait = matchWaitTime(d.name, d.address, waits)
    return wait ? [wait] : []
  })
  const chosenWait = isReturn
    ? undefined
    : saved
      ? matchWaitTime(saved.name, saved.address, waits)
      : form.destinationId === CUSTOM
        ? matchWaitTime(form.customName || form.customAddress, form.customAddress, waits)
        : undefined

  // A return trip goes from where the outbound one went, back to the partner's address
  const returnFrom =
    mode === 'return' && source
      ? { name: source.destinationName, detail: source.destinationAddress }
      : mode === 'edit' && source?.returnOfRideId
        ? { name: source.pickupAddress, detail: undefined }
        : undefined
  const from = returnFrom ?? { name: house.name, detail: house.address }
  const to = isReturn
    ? { name: house.name, detail: house.address }
    : saved
      ? { name: saved.name, detail: saved.address }
      : form.destinationId === CUSTOM && form.customPicked
        ? { name: form.customName || form.customAddress, detail: form.customName ? form.customAddress : undefined }
        : undefined

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending) return

    // Check the pickup time against the real clock, in case the form sat open for a while.
    const at = clock()
    setNow(at)
    setShowErrors(true)
    const problems = validate(at)
    const firstProblem = (Object.keys(FIELD_TARGETS) as Field[]).find((f) => problems[f])
    if (firstProblem) {
      jumpTo(firstProblem)
      return
    }

    const pickupTime = form.type === 'ON_DEMAND' ? new Date().toISOString() : new Date(pickupMs).toISOString()
    const destination = isReturn
      ? { destinationId: undefined, destinationName: house.name, destinationAddress: houseAddress(house) }
      : saved
        ? { destinationId: saved.id, destinationName: saved.name, destinationAddress: saved.address }
        : {
            destinationId: undefined,
            destinationName: form.customName.trim() || form.customAddress.trim(),
            destinationAddress: form.customAddress.trim(),
          }
    const details = {
      type: form.type,
      pickupTime,
      passengers: form.passengers,
      riderNames: form.riderNames.map((n) => n.trim()),
      needsWheelchair: form.needsWheelchair,
      needsAssistance: form.needsAssistance,
      pickupInstructions: form.pickupInstructions.trim() || undefined,
      notes: form.notes.trim() || undefined,
      ...destination,
    }

    setError('')
    setSending(true)
    try {
      let ride: Ride
      if (mode === 'edit' && source) {
        ride = await dataService.updateRide(source.id, details)
      } else {
        const base = {
          ...details,
          orgId: house.orgId,
          houseId: house.id,
          requestedBy: user.id,
          estimatedFareSaved: estimateFare(),
        }
        ride =
          mode === 'return' && source
            ? await dataService.requestRide(
                {
                  ...base,
                  pickupAddress: source.destinationAddress,
                  returnOfRideId: source.id,
                  preferredDriverId: source.driverId, // ask the same driver first
                },
                requestId.current,
              )
            : await dataService.requestRide({ ...base, pickupAddress: houseAddress(house) }, requestId.current)
        requestId.current = crypto.randomUUID()
      }
      if (mode === 'new') clearDraft(user.id)
      refresh()
      navigate(ridePath(ride.id), { state: { justSaved: mode === 'edit' ? 'changed' : 'booked' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSending(false)
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' }))
    }
  }

  const title = { new: 'Request a ride', again: 'Book this ride again', return: 'Book the return trip', edit: 'Change this ride' }[mode]
  const intro = {
    new: 'It takes about a minute.',
    again: `We've copied the details from the ride to ${source?.destinationName}. Pick a new time.`,
    return: `Bring the client home from ${source?.destinationName}.`,
    edit:
      source?.status === 'ACCEPTED'
        ? 'Changing the time, place, or passengers sends the ride back to drivers. We ask the current driver first.'
        : 'Update anything below. Drivers who were asked will see the new details.',
  }[mode]
  const sendLabel = { new: 'Request ride', again: 'Request ride', return: 'Book return trip', edit: 'Save changes' }[mode]
  const backTo = source && mode !== 'again' ? ridePath(source.id) : '/partner'

  const submitButton = (
    <button type="submit" className={`${primaryButton} w-full`} disabled={sending}>
      {sending ? (
        <>
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
          {mode === 'edit' ? 'Saving…' : 'Sending…'}
        </>
      ) : (
        <>
          {sendLabel}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </>
      )}
    </button>
  )

  const problemNote = showErrors && problemCount > 0 && (
    <p className="flex items-start gap-2 text-sm font-medium text-red-700">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {problemCount === 1 ? '1 field needs' : `${problemCount} fields need`} a look. They're marked in red.
    </p>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-28 lg:pb-0">
      <div className="mb-6 animate-fade-up">
        <Link
          to={backTo}
          className="-ml-1 mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-slate-500 transition hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {source && mode !== 'again' ? 'Back to the ride' : 'Back to your rides'}
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-1 text-slate-600">
          {intro} Fields marked{' '}
          <span className="font-semibold text-red-600" aria-hidden>
            *
          </span>
          <span className="sr-only">with a star</span> are required.
        </p>
        {restored && (
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900 ring-1 ring-brand-100">
            <History className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">We kept the request you hadn't sent yet.</span>
            <button type="button" className="font-semibold underline underline-offset-2" onClick={startOver}>
              Start over
            </button>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8">
        <div className="space-y-5">
          <FormSection
            id="where"
            step={1}
            title="Where to"
            description={isReturn ? 'The trip back to your address.' : 'Pick a saved place or search any address.'}
            required
            done={whereDone}
          >
            {isReturn ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4 font-semibold text-ink">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand-600" aria-hidden />
                  {from.name}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" aria-label="to" />
                <span className="inline-flex items-center gap-2">
                  <HouseIcon className="h-5 w-5 text-coral-500" aria-hidden />
                  {house.name}
                </span>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <span className={label}>Pick up from</span>
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-50 text-coral-600" aria-hidden>
                      <HouseIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{house.name}</span>
                      <span className="block truncate text-sm text-slate-500">{house.address}</span>
                    </span>
                  </div>
                </div>

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
                    {listed.map((d) => {
                      const wait = matchWaitTime(d.name, d.address, waits)
                      return (
                        <OptionTile
                          key={d.id}
                          name="destination"
                          checked={form.destinationId === d.id}
                          onChange={() => update({ destinationId: d.id })}
                          title={d.name}
                          description={d.address}
                          note={wait ? waitNote(wait) : undefined}
                          icon={<MapPin className="h-5 w-5" />}
                          badge={usedBefore.has(d.id) ? 'Used before' : undefined}
                          invalid={!!shown.destination}
                        />
                      )
                    })}
                    <OptionTile
                      name="destination"
                      checked={form.destinationId === CUSTOM}
                      onChange={() => update({ destinationId: CUSTOM })}
                      title="Somewhere else"
                      description="Search any address"
                      icon={<Navigation className="h-5 w-5" />}
                      dashed
                      invalid={!!shown.destination}
                    />
                  </div>
                  {q && listed.length === 0 && (
                    <p className="mt-3 text-sm text-slate-500">No saved place matches “{query.trim()}”. Choose “Somewhere else” to search for the address.</p>
                  )}
                  <FieldMessage
                    id="destination-message"
                    error={shown.destination}
                    hint={
                      listedWaits.length > 0
                        ? 'Wait times are to be seen right now. More urgent needs go first.'
                        : undefined
                    }
                  />
                </fieldset>

                {form.destinationId === CUSTOM && (
                  <AddressPicker
                    id="custom-address"
                    className="animate-fade-up"
                    label="Address"
                    required
                    placeholder="e.g. 1081 Burrard St or St. Paul's Hospital"
                    hint="Search and pick the address from the list, so the driver can find it."
                    selectedHint={chosenWait ? waitNote(chosenWait) : undefined}
                    value={form.customAddress}
                    selected={form.customPicked}
                    error={shown.customAddress}
                    onQueryChange={(customAddress) => update({ customAddress, customName: '', customPicked: false })}
                    onSelect={(place) =>
                      update({ customAddress: `${place.address}, ${place.city}`, customName: place.name ?? place.address, customPicked: true })
                    }
                  />
                )}
              </div>
            )}
            <InlineMatchHint match={match} checks={['city']} />
          </FormSection>

          <FormSection id="when" step={2} title="When" description="Book ahead, or find a driver now." required done={whenDone}>
            <fieldset>
              <legend className="sr-only">When does the client need the ride?</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <OptionTile
                  name="when"
                  checked={form.type === 'SCHEDULED'}
                  onChange={() => update({ type: 'SCHEDULED' })}
                  title="Schedule for later"
                  description="Pick a date and time"
                  icon={<CalendarClock className="h-5 w-5" />}
                />
                <OptionTile
                  name="when"
                  checked={form.type === 'ON_DEMAND'}
                  onChange={() => update({ type: 'ON_DEMAND' })}
                  title="As soon as possible"
                  description="Find a driver right now"
                  icon={<Zap className="h-5 w-5" />}
                />
              </div>
            </fieldset>

            {form.type === 'SCHEDULED' ? (
              <div key="scheduled" className="mt-4 animate-fade-up space-y-4">
                <div>
                  <span className={label} id="quick-picks">
                    Quick picks
                  </span>
                  <div className="flex flex-wrap gap-2" role="group" aria-labelledby="quick-picks">
                    {picks.map((p) => {
                      const on = form.pickupTime === p.value
                      return (
                        <button
                          key={p.label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => update({ pickupTime: p.value })}
                          className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-95 ${
                            on
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <PickupTimePicker
                  id="pickup-time"
                  value={form.pickupTime}
                  now={now}
                  error={shown.pickupTime}
                  hint={pickupValid ? `Pickup: ${describePickup(pickupMs, now)}` : undefined}
                  onChange={(pickupTime) => update({ pickupTime })}
                />
              </div>
            ) : (
              <p key="now" className="mt-4 flex animate-fade-up items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                Drivers taking requests right now are asked as soon as you send this. If nobody accepts within {ON_DEMAND_GIVE_UP_MINUTES} minutes, the request
                is cancelled so you can make other plans.
              </p>
            )}
            <InlineMatchHint match={match} checks={['schedule']} />
          </FormSection>

          <FormSection id="who" step={3} title="Who's riding" required done={whoDone}>
            <div>
              <span id="passengers-label" tabIndex={-1} className={`${label} focus:outline-none`}>
                Passengers
                <RequiredMark />
              </span>
              <PassengerStepper labelId="passengers-label" value={form.passengers} onChange={setPassengers} max={maxRiders} />
              <FieldMessage id="passengers-message" error={shown.passengers} hint={`Up to ${maxRiders} per ride, the most any driver's vehicle can take.`} />
            </div>
            <fieldset className="mt-5" aria-describedby="rider-names-message">
              <legend className={label}>
                {form.passengers === 1 ? "Passenger's name" : "Passengers' names"}
                <span className="ml-1 font-normal text-slate-500">(optional)</span>
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {form.riderNames.map((name, i) => (
                  <div key={i} className="relative">
                    <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                      id={`rider-name-${i}`}
                      className={`${input} pl-11`}
                      autoComplete="off"
                      maxLength={MAX_NAME}
                      aria-label={`Passenger ${i + 1} name`}
                      aria-invalid={shown.riderNames && tooLong(name, MAX_NAME) ? true : undefined}
                      placeholder={form.passengers === 1 ? 'e.g. Sam Rivera' : `Passenger ${i + 1}`}
                      value={name}
                      onChange={(e) => setForm((f) => ({ ...f, riderNames: f.riderNames.map((n, j) => (j === i ? e.target.value : n)) }))}
                    />
                  </div>
                ))}
              </div>
              <FieldMessage id="rider-names-message" error={shown.riderNames} hint="Helps the driver know who to pick up." />
            </fieldset>
            <InlineMatchHint match={match} checks={['seats']} />
          </FormSection>

          <FormSection id="extras" step={4} title="Extra details" description="Help the driver plan a smooth ride.">
            <div className="space-y-5">
              <fieldset>
                <legend className={label}>Travel needs</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <OptionTile
                    type="checkbox"
                    checked={form.needsWheelchair}
                    onChange={() => update({ needsWheelchair: !form.needsWheelchair })}
                    title="Wheelchair accessible"
                    description="Only accessible vehicles are asked"
                    icon={<Accessibility className="h-5 w-5" />}
                  />
                  <OptionTile
                    type="checkbox"
                    checked={form.needsAssistance}
                    onChange={() => update({ needsAssistance: !form.needsAssistance })}
                    title="Help getting in and out"
                    description="The driver lends a hand"
                    icon={<HandHelping className="h-5 w-5" />}
                  />
                </div>
                <InlineMatchHint match={match} checks={['wheelchair']} />
              </fieldset>

              <TextField
                id="instructions"
                label="Where the driver meets the client"
                icon={<DoorOpen className="h-5 w-5" />}
                maxLength={MAX_NOTE}
                value={form.pickupInstructions}
                error={shown.pickupInstructions}
                onChange={(e) => update({ pickupInstructions: e.target.value })}
              />

              <div>
                <label className={label} htmlFor="notes">
                  Notes for the driver
                  <span className="ml-1 font-normal text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  maxLength={MAX_NOTE}
                  className={`${input} resize-y py-3`}
                  placeholder="e.g. Uses a walker. The appointment is on the 3rd floor."
                  aria-invalid={shown.notes ? true : undefined}
                  aria-describedby="notes-message"
                  value={form.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                />
                <FieldMessage id="notes-message" error={shown.notes} />
              </div>
            </div>
          </FormSection>

          {/* TODO: suggest group rides (logic/groupRides.ts) before submitting */}
        </div>

        <aside className="animate-fade-up lg:sticky lg:top-24" style={{ animationDelay: '120ms' }} aria-label="Trip summary">
          <TripSummary
            from={from}
            to={to}
            when={form.type === 'ON_DEMAND' ? 'As soon as possible' : pickupValid ? describePickup(pickupMs, now) : undefined}
            wait={chosenWait ? waitSummary(chosenWait) : undefined}
            rider={riderLabel(form)}
            passengers={form.passengers}
            needs={[...(form.needsWheelchair ? ['Wheelchair'] : []), ...(form.needsAssistance ? ['Help in and out'] : [])]}
            done={doneCount}
            total={steps.length}
          >
            <MatchLine match={match} />
            {error && (
              <p ref={errorRef} role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-3 text-sm text-red-900">
                <strong>{mode === 'edit' ? "We couldn't save your changes." : "We couldn't send this ride."}</strong> {error}
              </p>
            )}
            <div className="hidden space-y-3 lg:block">
              {problemNote}
              {submitButton}
              {mode === 'edit' && (
                <Link to={backTo} className={`${ghostButton} w-full`}>
                  Keep the ride as it was
                </Link>
              )}
            </div>
          </TripSummary>
        </aside>
      </div>

      {/* On phones the send button stays in reach at the bottom of the screen. */}
      <div className="native-bottom-chrome no-print fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3  lg:hidden">
        <div className="mx-auto max-w-5xl space-y-2">
          {problemNote}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold text-ink">
                {doneCount === steps.length ? 'Ready to send' : `${doneCount} of ${steps.length} steps done`}
              </span>
              <span className={`block truncate ${match && match.count === 0 ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
                {match && match.count === 0 ? 'No driver fits yet' : to ? `To ${to.name} · ${passengersLabel(form.passengers)}` : 'Choose a destination'}
              </span>
            </div>
            <div className="w-44 shrink-0">{submitButton}</div>
          </div>
        </div>
      </div>
    </form>
  )
}
