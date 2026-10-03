import { useState, type FormEvent } from 'react'
import { DriverFields } from '../../components/DriverFields'
import { emptyDriverDraft, splitDriverDraft, type DriverDraft } from '../../components/driverDraft'
import { card, pageTitle, primaryButton } from '../../components/ui'
import { describeRequestHours, formatNotice } from '../../logic/requestHours'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

const statusText = { PENDING: 'Waiting for approval', APPROVED: 'Approved', REJECTED: 'Not approved' }

// Transport options: an organization's own drivers and vehicles.
export function Drivers() {
  const { currentUser, users, refresh } = useApp()
  const orgId = currentUser?.orgId
  const drivers = useData(() => dataService.listDrivers(orgId), orgId) ?? []
  const [draft, setDraft] = useState<DriverDraft>({ ...emptyDriverDraft, background: 'ORG_DRIVER' })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    const [user, driver] = splitDriverDraft(draft)
    await dataService.registerDriver(user, { ...driver, orgId })
    setDraft({ ...emptyDriverDraft, background: 'ORG_DRIVER' })
    refresh()
  }

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Our drivers</h1>
      <p>Add the drivers and vehicles your organization can offer, and when to send them ride requests.</p>

      {drivers.length === 0 && <p>No drivers yet.</p>}
      <div className="space-y-3">
        {drivers.map((d) => (
          <div key={d.id} className={card}>
            <p className="text-lg font-semibold">
              {users.find((u) => u.id === d.userId)?.name} · {statusText[d.status]}
            </p>
            <p className="text-slate-600">
              {d.vehicle} · {d.seats} spaces{d.wheelchairAccessible && ' · Wheelchair accessible'}
            </p>
            <p className="text-slate-600">
              Requests: {describeRequestHours(d.requestHours)} · {formatNotice(d.minNoticeHours)} notice
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={`${card} max-w-lg space-y-4`}>
        <h2 className="text-xl font-bold">Add a driver</h2>
        <DriverFields value={draft} onChange={setDraft} showBackground={false} />
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
          Add driver
        </button>
      </form>
    </div>
  )
}
