import { BadgeCheck, Building2, Car, ClipboardCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DashboardHeader } from '../../components/dashboard/DashboardHeader'
import { StatTile } from '../../components/dashboard/StatTile'
import { card, primaryButton, secondaryButton } from '../../components/ui'
import { BACKGROUND_LABELS, ORG_TYPE_LABELS } from '../../constants'
import { faresSavedFor, formatDollars } from '../../logic/estimateFare'
import { describeRequestHours } from '../../logic/requestHours'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'
import type { VerificationStatus } from '../../types'

// e.g. "1 organization · 2 drivers", skipping a kind with none waiting
function waitingNote(orgs: number, drivers: number): string {
  const parts = [orgs && `${orgs} ${orgs === 1 ? 'organization' : 'organizations'}`, drivers && `${drivers} ${drivers === 1 ? 'driver' : 'drivers'}`]
  return parts.filter(Boolean).join(' · ')
}

export function Approvals() {
  const { currentUser, users, refresh } = useApp()
  const pending = useData(() => dataService.listPending())
  const orgs = useData(() => dataService.listOrganizations()) ?? []
  const impact = useData(() => dataService.getImpact())
  const waiting = (pending?.orgs.length ?? 0) + (pending?.drivers.length ?? 0)

  async function setOrg(id: string, status: VerificationStatus) {
    await dataService.setOrgStatus(id, status)
    refresh()
  }

  async function setDriver(id: string, status: VerificationStatus) {
    await dataService.setDriverStatus(id, status)
    refresh()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <DashboardHeader
          name={currentUser?.name ?? 'admin'}
          summary={
            pending === undefined
              ? 'Loading…'
              : waiting > 0
                ? `${waiting} ${waiting === 1 ? 'account is' : 'accounts are'} waiting for review.`
                : 'All caught up. Nothing is waiting for review.'
          }
          actions={
            <Link to="/admin/accounts" className={`${secondaryButton} min-h-12`}>
              <Users className="h-5 w-5" aria-hidden />
              All accounts
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Waiting for review"
            value={waiting}
            icon={<ClipboardCheck className="h-5 w-5" />}
            tone="amber"
            note={waiting ? waitingNote(pending?.orgs.length ?? 0, pending?.drivers.length ?? 0) : 'All caught up'}
            alert={waiting > 0}
          />
          <StatTile label="Organizations" value={impact?.organizations ?? '–'} icon={<Building2 className="h-5 w-5" />} tone="ink" note="Approved partners" />
          <StatTile label="Verified drivers" value={impact?.verifiedDrivers ?? '–'} icon={<BadgeCheck className="h-5 w-5" />} tone="teal" note="Ready to get requests" />
          <StatTile label="Free rides" value={impact?.ridesCompleted ?? '–'} icon={<Car className="h-5 w-5" />} tone="brand" note={impact ? `${formatDollars(faresSavedFor(impact.ridesCompleted))} saved, one fare per trip` : undefined} />
        </div>
      </div>
      {/* TODO: how we verify organizations and drivers is still an open question */}

      <section>
        <h2 className="mb-3 text-xl font-bold">Organizations</h2>
        {pending?.orgs.length === 0 && <p>No organizations waiting.</p>}
        <div className="space-y-3">
          {pending?.orgs.map((org) => (
            <div key={org.id} className={card}>
              <p className="break-words text-lg font-semibold">{org.name}</p>
              <p className="text-slate-600">
                {ORG_TYPE_LABELS[org.type]} · {org.contactName}, {org.contactPhone}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:flex">
                <button type="button" className={primaryButton} onClick={() => setOrg(org.id, 'APPROVED')}>
                  Approve
                </button>
                <button type="button" className={secondaryButton} onClick={() => setOrg(org.id, 'REJECTED')}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Drivers</h2>
        {pending?.drivers.length === 0 && <p>No drivers waiting.</p>}
        <div className="space-y-3">
          {pending?.drivers.map((driver) => (
            <div key={driver.id} className={card}>
              <p className="break-words text-lg font-semibold">{users.find((u) => u.id === driver.userId)?.name}</p>
              <p className="text-slate-600">
                {BACKGROUND_LABELS[driver.background]}
                {driver.orgId && ` · ${orgs.find((o) => o.id === driver.orgId)?.name}`}
              </p>
              <p className="text-slate-600">
                {driver.vehicle} · {driver.seats} spaces
                {driver.wheelchairAccessible && ' · Wheelchair accessible'} · {driver.serviceCities.join(', ')}
              </p>
              <p className="text-slate-600">
                Requests: {describeRequestHours(driver.requestHours)}
              </p>
              <p className="text-slate-600">
                Licence: {driver.licenceFile ?? 'missing'}
                {driver.proofFile && ` · Professional proof: ${driver.proofFile}`}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:flex">
                <button type="button" className={primaryButton} onClick={() => setDriver(driver.id, 'APPROVED')}>
                  Approve
                </button>
                <button type="button" className={secondaryButton} onClick={() => setDriver(driver.id, 'REJECTED')}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
