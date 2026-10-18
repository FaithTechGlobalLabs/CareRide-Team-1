import { ChevronDown, Flag, Mail, Phone, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { CopyButton } from '../../components/CopyButton'
import { RideHistory } from '../../components/RideHistory'
import { ROLE_TONE, secondaryButton, tones } from '../../components/ui'
import { BACKGROUND_LABELS, ORG_TYPE_LABELS } from '../../constants'
import { useData } from '../../hooks/useData'
import { faresSavedFor, formatDollars } from '../../logic/estimateFare'
import { ratingCounts } from '../../logic/feedback'
import { formatDayTime } from '../../logic/formatTime'
import { ROLE_LABELS } from '../../logic/homeFor'
import { describeRequestHours } from '../../logic/requestHours'
import { dataService } from '../../services'
import type { Driver, House, Organization, Ride, RideFeedback, User, VerificationStatus } from '../../types'
import { ExternalLink } from '../../native/ExternalLink'

const STATUS_LOOK: Record<VerificationStatus, { text: string; className: string }> = {
  PENDING: { text: 'Waiting for approval', className: 'bg-amber-50 text-amber-800' },
  APPROVED: { text: 'Approved', className: 'bg-emerald-50 text-emerald-800' },
  REJECTED: { text: 'Not approved', className: 'bg-red-50 text-red-700' },
}

interface Details {
  org?: Organization
  house?: House
  driver?: Driver
  rides: Ride[]
  driverCount?: number
  feedback?: RideFeedback[] // on a driver's rides, or a partner organization's
}

const RECENT_RIDES = 5

// Everything linked to an account, depending on its role.
async function loadDetails(user: User): Promise<Details> {
  const orgs = await dataService.listOrganizations()
  const org = orgs.find((o) => o.id === user.orgId)

  if (user.role === 'DRIVER') {
    const driver = (await dataService.listDrivers()).find((d) => d.userId === user.id)
    if (!driver) return { org, rides: [] }
    const [rides, feedback] = await Promise.all([dataService.listMyRides(driver.id), dataService.listFeedback({ driverId: driver.id })])
    return { org, driver, rides, feedback }
  }
  if (user.role === 'PARTNER' && org) {
    const house = user.houseId ? (await dataService.listHouses()).find((h) => h.id === user.houseId) : undefined
    const [booked, feedback] = await Promise.all([
      house ? dataService.listRidesForHouse(house.id) : [],
      dataService.listFeedback({ orgId: org.id }),
    ])
    return { org, house, rides: booked, feedback }
  }
  if (user.role === 'ORG_ADMIN' && org) {
    const drivers = await dataService.listDrivers(org.id)
    const given = await dataService.listRidesForOrg(org.id)
    return { org, rides: given, driverCount: drivers.length }
  }
  return { org, rides: [] }
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const look = STATUS_LOOK[status]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${look.className}`}>{look.text}</span>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-slate-500">{title}</h3>
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{children}</dl>
    </section>
  )
}

function Row({ label, children, copy }: { label: string; children: ReactNode; copy?: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink">{children}</dd>
      {copy && (
        <div className="-ml-2 sm:ml-0">
          <CopyButton text={copy} label={label.toLowerCase()} />
        </div>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}

const FEEDBACK_LOOK = {
  UP: { icon: ThumbsUp, text: 'Front desk: it went well', className: 'bg-emerald-50 text-emerald-700' },
  DOWN: { icon: ThumbsDown, text: "Front desk: it didn't go well", className: 'bg-red-50 text-red-700' },
  FLAG: { icon: Flag, text: 'Driver flagged an issue', className: 'bg-amber-50 text-amber-800' },
}

// Newest first, each with the ride it's about
function FeedbackList({ feedback, rides }: { feedback: RideFeedback[]; rides: Ride[] }) {
  const sorted = [...feedback].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {sorted.map((f) => {
        const look = FEEDBACK_LOOK[f.authorRole === 'DRIVER' ? 'FLAG' : (f.rating ?? 'UP')]
        const Icon = look.icon
        const ride = rides.find((r) => r.id === f.rideId)
        return (
          <li key={f.id} className="flex gap-3 px-4 py-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${look.className}`} aria-hidden>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-ink">{look.text}</p>
              <p className="text-sm text-slate-500">
                {ride ? `Ride to ${ride.destinationName} · ${formatDayTime(ride.pickupTime)}` : `Ride ${f.rideId}`}
              </p>
              {f.note && <p className="mt-1 whitespace-pre-line break-words text-slate-700">“{f.note}”</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

interface Props {
  user: User
  isSelf: boolean
  onClose: () => void
}

// A pop-up with the full picture of one account, for the platform admin.
export function AccountDetails({ user, isSelf, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const details = useData(() => loadDetails(user), user.id)
  const tone = tones[ROLE_TONE[user.role]]

  // showModal gives us the backdrop, focus trapping, and Escape to close.
  // No close() on cleanup: its close event would call onClose, and unmounting removes the dialog anyway.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const rides = details?.rides ?? []
  const completed = rides.filter((r) => r.status === 'COMPLETED')
  const upcoming = rides.filter((r) => ['SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION', 'PICKED_UP'].includes(r.status))
  const saved = faresSavedFor(completed.length)
  const { org, house, driver, feedback } = details ?? {}
  const ratings = ratingCounts(feedback ?? [])
  const recent = [...rides].sort((a, b) => b.pickupTime.localeCompare(a.pickupTime)).slice(0, RECENT_RIDES)

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="account-details-title"
      onClose={onClose}
      // A click on the dimmed area outside the panel lands on the dialog itself
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-xl bg-slate-50 p-0 shadow-xl backdrop:bg-slate-900/50 open:animate-pop"
    >
      <div className="flex max-h-[90vh] flex-col">
        <header className="flex items-start gap-4 border-b border-slate-200 bg-white p-5 sm:p-6">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold ${tone.tile}`} aria-hidden>
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="account-details-title" className="break-words text-xl font-extrabold tracking-tight text-ink">
              {user.name}
              {isSelf && <span className="ml-2 text-sm font-normal text-slate-500">(you)</span>}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone.tile}`}>{ROLE_LABELS[user.role]}</span>
              {driver && <StatusPill status={driver.status} />}
              {!driver && org && (user.role === 'ORG_ADMIN' || user.role === 'PARTNER') && <StatusPill status={org.status} />}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
          {!details ? (
            <p className="text-slate-500" role="status">
              Loading details…
            </p>
          ) : (
            <>
              {user.role !== 'PLATFORM_ADMIN' && (
                <div className="grid grid-cols-3 gap-3">
                  <Stat value={completed.length} label="Rides completed" />
                  <Stat value={upcoming.length} label="Open or upcoming" />
                  <Stat value={formatDollars(saved)} label="Saved, one fare per trip" />
                </div>
              )}

              <Section title="Contact">
                <Row label="Email" copy={user.email}>
                  {user.email ? (
                    <ExternalLink href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 break-all hover:underline">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      {user.email}
                    </ExternalLink>
                  ) : (
                    'None'
                  )}
                </Row>
                <Row label="Phone" copy={user.phone || undefined}>
                  {user.phone ? (
                    <ExternalLink href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      {user.phone}
                    </ExternalLink>
                  ) : (
                    'None'
                  )}
                </Row>
                <Row label="Account ID" copy={user.id}>
                  <span className="font-mono text-sm">{user.id}</span>
                </Row>
              </Section>

              {driver && (
                <Section title="Driver profile">
                  <Row label="Drives as">{BACKGROUND_LABELS[driver.background]}</Row>
                  <Row label="Vehicle">
                    {driver.vehicle} · {driver.seats} {driver.seats === 1 ? 'space' : 'spaces'}
                    {driver.wheelchairAccessible && ' · Wheelchair accessible'}
                  </Row>
                  <Row label="Cities">{driver.serviceCities.join(', ') || 'None'}</Row>
                  <Row label="Request hours">{describeRequestHours(driver.requestHours)}</Row>
                  {driver.licenceFile && <Row label="Licence">{driver.licenceFile}</Row>}
                  {driver.proofFile && <Row label="Professional proof">{driver.proofFile}</Row>}
                </Section>
              )}

              {house && (
                <Section title="Pickup location">
                  <Row label="Name">{house.name}</Row>
                  <Row label="Address" copy={`${house.address}, ${house.city}`}>
                    {house.address}, {house.city}
                  </Row>
                  <Row label="Front desk phone">{house.phone}</Row>
                </Section>
              )}

              {org && (
                <Section title="Organization">
                  <Row label="Name">{org.name}</Row>
                  <Row label="Type">{ORG_TYPE_LABELS[org.type]}</Row>
                  <Row label="Status">
                    <StatusPill status={org.status} />
                  </Row>
                  <Row label="Contact">
                    {org.contactName} · {org.contactPhone}
                  </Row>
                  {org.bookingNotifications && <Row label="New bookings to">{org.bookingNotifications}</Row>}
                  {details.driverCount !== undefined && <Row label="Drivers">{details.driverCount}</Row>}
                </Section>
              )}

              {feedback && (
                <section>
                  <h3 className="mb-2 text-sm font-bold text-slate-500">
                    Feedback
                    {(ratings.up > 0 || ratings.down > 0) && (
                      <span className="ml-2 font-semibold text-slate-600">
                        <ThumbsUp className="mb-0.5 inline h-3.5 w-3.5" aria-label="Thumbs up" /> {ratings.up} ·{' '}
                        <ThumbsDown className="mb-0.5 inline h-3.5 w-3.5" aria-label="Thumbs down" /> {ratings.down}
                      </span>
                    )}
                  </h3>
                  {feedback.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-500">No feedback yet.</p>
                  ) : (
                    <FeedbackList feedback={feedback} rides={rides} />
                  )}
                </section>
              )}

              {recent.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-bold text-slate-500">Recent rides and their history</h3>
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {recent.map((r) => (
                      <li key={r.id}>
                        <details className="group px-4 py-3">
                          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 marker:content-none [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0">
                              <span className="block font-medium text-ink">Ride to {r.destinationName}</span>
                              <span className="block text-sm text-slate-500">{formatDayTime(r.pickupTime)}</span>
                            </span>
                            <ChevronDown className="details-chevron h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" aria-hidden />
                          </summary>
                          <div className="mt-3">
                            <RideHistory rideId={r.id} />
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {user.role === 'DRIVER' && !driver && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This account has no driver profile.</p>
              )}
              {user.role === 'PARTNER' && !house && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This account has no pickup location.</p>
              )}
            </>
          )}
        </div>

        <footer className="flex justify-end border-t border-slate-200 bg-white p-4">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </dialog>
  )
}
