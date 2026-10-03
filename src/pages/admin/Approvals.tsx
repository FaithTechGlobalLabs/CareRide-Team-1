import { card, pageTitle, primaryButton, secondaryButton } from '../../components/ui'
import { BACKGROUND_LABELS, ORG_TYPE_LABELS } from '../../constants'
import { describeRequestHours, formatNotice } from '../../logic/requestHours'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'
import type { VerificationStatus } from '../../types'

export function Approvals() {
  const { users, refresh } = useApp()
  const pending = useData(() => dataService.listPending())
  const orgs = useData(() => dataService.listOrganizations()) ?? []

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
      <h1 className={pageTitle}>Approvals</h1>
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
                Requests: {describeRequestHours(driver.requestHours)} · {formatNotice(driver.minNoticeHours)} notice
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
