import { card, pageTitle, primaryButton, secondaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'
import type { VerificationStatus } from '../../types'

export function Approvals() {
  const { users, refresh } = useApp()
  const pending = useData(() => dataService.listPending())

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

      <section>
        <h2 className="mb-3 text-xl font-bold">Organizations</h2>
        {pending?.orgs.length === 0 && <p>No organizations waiting.</p>}
        <div className="space-y-3">
          {pending?.orgs.map((org) => (
            <div key={org.id} className={card}>
              <p className="text-lg font-semibold">{org.name}</p>
              <p className="text-slate-600">
                {org.type === 'SOCIAL_SERVICE' ? 'Requests rides' : 'Provides rides'} · {org.contactName},{' '}
                {org.contactPhone}
              </p>
              <div className="mt-3 flex gap-3">
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
              <p className="text-lg font-semibold">{users.find((u) => u.id === driver.userId)?.name}</p>
              <p className="text-slate-600">
                {driver.vehicle} · {driver.seats} seats
                {driver.wheelchairAccessible && ' · Wheelchair accessible'} · {driver.serviceCities.join(', ')}
              </p>
              <p className="text-slate-600">
                Licence: {driver.licenceFile ?? 'missing'} · Record check: {driver.recordCheckFile ?? 'missing'}
              </p>
              <div className="mt-3 flex gap-3">
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
