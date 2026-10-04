import { CalendarClock, Car, Check, Hourglass, Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { DriverVehicleFields } from '../../components/DriverFields'
import type { DriverDraft, FieldErrors } from '../../components/driverDraft'
import { NoticePicker, RequestHoursEditor } from '../../components/RequestHoursEditor'
import { RequestStatusCard } from '../../components/RequestStatusCard'
import { card, ghostButton, pageTitle, primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useCurrentDriver } from '../../hooks/useCurrent'
import { requestHoursError } from '../../logic/requestHours'
import { dataService } from '../../services'
import type { DriverSettings } from '../../services/dataService'

type Editable = Omit<DriverSettings, 'available'>

function validate(s: Editable): FieldErrors {
  return {
    requestHours: requestHoursError(s.requestHours),
    vehicle: s.vehicle.trim() ? undefined : 'Describe your vehicle so clients can find it.',
    serviceCities: s.serviceCities.length ? undefined : 'Pick at least one city.',
  }
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className={`${card} sm:p-8`}>
      <div className="mb-6 flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600" aria-hidden>
          {icon}
        </span>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          <p className="text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

// Where drivers choose when we send them requests and which rides suit them.
export function Settings() {
  const { refresh } = useApp()
  const driver = useCurrentDriver()
  // Only the fields they've touched; everything else comes straight from the saved profile
  const [edits, setEdits] = useState<Partial<Editable>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!driver) return <p>No driver profile found.</p>

  const current: Editable = {
    requestHours: driver.requestHours,
    minNoticeHours: driver.minNoticeHours,
    vehicle: driver.vehicle,
    seats: driver.seats,
    wheelchairAccessible: driver.wheelchairAccessible,
    serviceCities: driver.serviceCities,
    ...edits,
  }
  const dirty = Object.keys(edits).length > 0
  const errors = validate(current)
  const shownErrors = showErrors ? errors : {}

  const change = (patch: Partial<Editable>) => {
    setEdits((e) => ({ ...e, ...patch }))
    setSaved(false)
  }

  // DriverVehicleFields works on a whole driver draft; keep only the vehicle fields it changes
  const vehicleDraft = { ...current, name: '', phone: '' } as DriverDraft
  const changeVehicle = ({ vehicle, seats, wheelchairAccessible, serviceCities }: DriverDraft) =>
    change({ vehicle, seats, wheelchairAccessible, serviceCities })

  async function setAvailable(available: boolean) {
    await dataService.updateDriver(driver!.id, { available })
    refresh()
  }

  async function save() {
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true)
      return
    }
    setSaving(true)
    try {
      await dataService.updateDriver(driver!.id, edits)
      setEdits({})
      setShowErrors(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  function discard() {
    setEdits({})
    setShowErrors(false)
  }

  return (
    <div className="space-y-6 pb-28">
      <div>
        <h1 className={`${pageTitle} mb-2`}>Request settings</h1>
        <p className="text-lg text-slate-600">Choose when CareRide asks you for help. You always decide which rides to take.</p>
      </div>

      <RequestStatusCard driver={driver} onPause={setAvailable} />

      <Section
        icon={<CalendarClock className="h-6 w-6" />}
        title="When to send you requests"
        description="We'll only notify you during these times. Outside them, requests go to other drivers."
      >
        <RequestHoursEditor
          value={current.requestHours}
          onChange={(requestHours) => change({ requestHours })}
          error={shownErrors.requestHours}
        />
      </Section>

      <Section
        icon={<Hourglass className="h-6 w-6" />}
        title="Notice"
        description="Skip last-minute rides if you need time to plan."
      >
        <NoticePicker value={current.minNoticeHours} onChange={(minNoticeHours) => change({ minNoticeHours })} />
      </Section>

      <Section
        icon={<Car className="h-6 w-6" />}
        title="Rides you can take"
        description="We only send you rides that fit your vehicle and the cities you drive in."
      >
        <DriverVehicleFields value={vehicleDraft} onChange={changeVehicle} errors={shownErrors} />
      </Section>

      {/* Save bar: slides up once something changes */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur-lg transition-transform duration-300 ${
          dirty || saved ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden={!dirty && !saved}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {dirty ? (
            <>
              <p className="font-semibold text-ink">You have unsaved changes</p>
              <div className="flex gap-2">
                <button type="button" className={ghostButton} onClick={discard} tabIndex={dirty ? 0 : -1}>
                  Discard
                </button>
                <button type="button" className={primaryButton} onClick={save} disabled={saving} tabIndex={dirty ? 0 : -1}>
                  {saving && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
                  Save changes
                </button>
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 font-semibold text-teal-700" role="status">
              <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> Settings saved
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
