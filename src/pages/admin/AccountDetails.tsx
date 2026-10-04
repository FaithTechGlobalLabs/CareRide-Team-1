import { Mail, Phone, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { CopyButton } from '../../components/CopyButton'
import { ROLE_TONE, secondaryButton, tones } from '../../components/ui'
import { ORG_TYPE_LABELS } from '../../constants'
import { useData } from '../../hooks/useData'
import { ROLE_LABELS } from '../../logic/homeFor'
import { describeRequestHours, formatNotice } from '../../logic/requestHours'
import { dataService } from '../../services'
import type { Driver, House, Organization, Ride, User, VerificationStatus } from '../../types'

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
  houseCount?: number
  driverCount?: number
}

// Everything linked to an account, depending on its role.
async function loadDetails(user: User): Promise<Details> {
  const orgs = await dataService.listOrganizations()
  const org = orgs.find((o) => o.id === user.orgId)

  if (user.role === 'DRIVER') {
    const driver = (await dataService.listDrivers()).find((d) => d.userId === user.id)
    return { org, driver, rides: driver ? await dataService.listMyRides(driver.id) : [] }
  }
  if (user.role === 'HOUSE') {
    const house = user.houseId ? (await dataService.listHouses()).find((h) => h.id === user.houseId) : undefined
    return { org, house, rides: house ? await dataService.listRidesForHouse(house.id) : [] }
  }
  if (user.role === 'ORG_ADMIN' && org) {
    const [houses, drivers] = await Promise.all([dataService.listHouses(org.id), dataService.listDrivers(org.id)])
    // Rides the org booked through its houses, plus rides its own drivers gave
    const booked = (await Promise.all(houses.map((h) => dataService.listRidesForHouse(h.id)))).flat()
    const given = await dataService.listRidesForOrg(org.id)
    const rides = [...new Map([...booked, ...given].map((r) => [r.id, r])).values()]
    return { org, rides, houseCount: houses.length, driverCount: drivers.length }
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
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">{children}</dl>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
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
  const saved = completed.reduce((sum, r) => sum + r.estimatedFareSaved, 0)
  const { org, house, driver } = details ?? {}

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="account-details-title"
      onClose={onClose}
      // A click on the dimmed area outside the panel lands on the dialog itself
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-3xl bg-slate-50 p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm open:animate-pop"
    >
      <div className="flex max-h-[90vh] flex-col">
        <header className="flex items-start gap-4 border-b border-slate-200 bg-white p-5 sm:p-6">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${tone.tile}`} aria-hidden>
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
              {!driver && org && user.role === 'ORG_ADMIN' && <StatusPill status={org.status} />}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
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
                  <Stat value={`$${Math.round(saved)}`} label="Fares saved" />
                </div>
              )}

              <Section title="Contact">
                <Row label="Email" copy={user.email}>
                  {user.email ? (
                    <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 break-all hover:underline">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      {user.email}
                    </a>
                  ) : (
                    'None'
                  )}
                </Row>
                <Row label="Phone" copy={user.phone || undefined}>
                  {user.phone ? (
                    <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      {user.phone}
                    </a>
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
                  <Row label="Vehicle">
                    {driver.vehicle} · {driver.seats} {driver.seats === 1 ? 'space' : 'spaces'}
                    {driver.wheelchairAccessible && ' · Wheelchair accessible'}
                  </Row>
                  <Row label="Cities">{driver.serviceCities.join(', ') || 'None'}</Row>
                  <Row label="Requests">{driver.available ? 'On' : 'Paused by driver'}</Row>
                  <Row label="Request hours">{describeRequestHours(driver.requestHours)}</Row>
                  <Row label="Notice">{formatNotice(driver.minNoticeHours)}</Row>
                </Section>
              )}

              {house && (
                <Section title="House">
                  <Row label="Name">{house.name}</Row>
                  <Row label="Address" copy={`${house.address}, ${house.city}`}>
                    {house.address}, {house.city}
                  </Row>
                  <Row label="House phone">{house.phone}</Row>
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
                  {details.houseCount !== undefined && <Row label="Houses">{details.houseCount}</Row>}
                  {details.driverCount !== undefined && <Row label="Own drivers">{details.driverCount}</Row>}
                </Section>
              )}

              {user.role === 'DRIVER' && !driver && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This account has no driver profile.</p>
              )}
              {user.role === 'HOUSE' && !house && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This account isn't linked to a house.</p>
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
