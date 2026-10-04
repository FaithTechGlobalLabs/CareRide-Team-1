import { BadgeCheck, Building2 } from 'lucide-react'
import { card, pageTitle, primaryButton, secondaryButton, tones } from '../../components/ui'
import { ORG_TYPE_LABELS } from '../../constants'
import { describeRequestHours, noticeLabel } from '../../logic/requestHours'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'
import type { VerificationStatus } from '../../types'

export function Approvals() {
  const { users, refresh } = useApp()
  const pending = useData(() => dataService.listPending())
  const orgs = useData(() => dataService.listOrganizations()) ?? []
  const drivers = useData(() => dataService.listDrivers()) ?? []

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

      <section aria-label="Network" className="grid grid-cols-2 gap-3">
        <div className={card}>
          <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tones.violet.tile}`} aria-hidden>
            <Building2 className="h-5 w-5" />
          </span>
          <div className={`font-display text-3xl font-black ${tones.violet.text}`}>{orgs.length}</div>
          <div className="text-slate-600">Organizations</div>
        </div>
        <div className={card}>
          <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tones.teal.tile}`} aria-hidden>
            <BadgeCheck className="h-5 w-5" />
          </span>
          <div className={`font-display text-3xl font-black ${tones.teal.text}`}>{drivers.length}</div>
          <div className="text-slate-600">Drivers</div>
        </div>
      </section>

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
              {driver.orgId && <p className="text-slate-600">{orgs.find((o) => o.id === driver.orgId)?.name}</p>}
              <p className="text-slate-600">
                {driver.vehicle} · {driver.seats} spaces
                {driver.wheelchairAccessible && ' · Wheelchair accessible'} · {driver.serviceCities.join(', ')}
              </p>
              <p className="text-slate-600">
                Requests: {describeRequestHours(driver.requestHours)} · {noticeLabel(driver.minNoticeHours)}
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
