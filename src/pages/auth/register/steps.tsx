import { Building2, Bus, Car, Home, Mail, MapPin, Pencil, Plus, Trash2, User as UserIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  DriverRequestFields,
  DriverVehicleFields,
} from '../../../components/DriverFields'
import type { FieldErrors } from '../../../components/driverDraft'
import { AddressPicker } from '../../../components/form/AddressPicker'
import { ChoiceCard } from '../../../components/form/ChoiceCard'
import { FieldMessage } from '../../../components/form/FieldMessage'
import { PasswordField } from '../../../components/form/PasswordField'
import { SelectField } from '../../../components/form/SelectField'
import { TextField } from '../../../components/form/TextField'
import { secondaryButton, type Tone } from '../../../components/ui'
import { CITIES } from '../../../constants'
import { describeRequestHours, formatNotice } from '../../../logic/requestHours'
import { SUGGESTED_DESTINATIONS, type RegisterDraft, type RegisterRole } from './draft'

export interface StepProps {
  draft: RegisterDraft
  update: (patch: Partial<RegisterDraft>) => void
  errors: FieldErrors
  goTo: (stepId: string) => void
}

const ROLES: { value: RegisterRole; title: string; description: string; icon: ReactNode; tone: Tone }[] = [
  {
    value: 'PARTNER',
    title: 'Book rides for the people we serve',
    description: 'For shelters, housing, and social service organizations.',
    icon: <Building2 className="h-6 w-6" />,
    tone: 'violet',
  },
  {
    value: 'PROVIDER',
    title: 'Give rides with our vehicles',
    description: 'For organizations with vans or drivers that can take bookings.',
    icon: <Bus className="h-6 w-6" />,
    tone: 'amber',
  },
  {
    value: 'DRIVER',
    title: 'Drive with CareRide',
    description: 'Give free rides when it suits your schedule.',
    icon: <Car className="h-6 w-6" />,
    tone: 'teal',
  },
]

export function RoleStep({ draft, update, errors }: StepProps) {
  return (
    <fieldset aria-describedby="role-message">
      <legend className="sr-only">How will you use CareRide?</legend>
      <div className="space-y-3" role="radiogroup">
        {ROLES.map((r) => (
          <ChoiceCard
            key={r.value}
            name="role"
            value={r.value}
            checked={draft.role === r.value}
            onChange={() => update({ role: r.value })}
            title={r.title}
            description={r.description}
            icon={r.icon}
            tone={r.tone}
          />
        ))}
      </div>
      <FieldMessage id="role-message" error={errors.role} />
    </fieldset>
  )
}

export function AccountStep({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <TextField
        id="name"
        label="Your full name"
        autoComplete="name"
        icon={<UserIcon className="h-5 w-5" />}
        value={draft.name}
        error={errors.name}
        onChange={(e) => update({ name: e.target.value })}
        data-autofocus
      />
      <TextField
        id="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        icon={<Mail className="h-5 w-5" />}
        placeholder="you@example.org"
        hint="You'll use this to sign in."
        value={draft.email}
        error={errors.email}
        onChange={(e) => update({ email: e.target.value })}
      />
      <PasswordField
        id="password"
        label="Create a password"
        autoComplete="new-password"
        hint="At least 8 characters."
        showStrength
        value={draft.password}
        error={errors.password}
        onChange={(e) => update({ password: e.target.value })}
      />
      {draft.role === 'DRIVER' && (
        <TextField
          id="driver-phone"
          label="Mobile phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="604-555-0123"
          hint="We use this to reach you about a ride."
          value={draft.driver.phone}
          error={errors.phone}
          onChange={(e) => update({ driver: { ...draft.driver, phone: e.target.value } })}
        />
      )}
    </div>
  )
}

export function OrganizationStep({ draft, update, errors }: StepProps) {
  const provider = draft.role === 'PROVIDER'
  return (
    <div className="space-y-5">
      <TextField
        id="orgName"
        label="Organization name"
        autoComplete="organization"
        icon={<Building2 className="h-5 w-5" />}
        placeholder={provider ? 'e.g. Community Van Share' : 'e.g. The Salvation Army'}
        value={draft.orgName}
        error={errors.orgName}
        onChange={(e) => update({ orgName: e.target.value })}
        data-autofocus
      />
      <TextField
        id="orgPhone"
        label="Main phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="604-555-0123"
        value={draft.orgPhone}
        error={errors.orgPhone}
        onChange={(e) => update({ orgPhone: e.target.value })}
      />
      <TextField
        id="notifications"
        label="Send new bookings to"
        optional={!provider}
        placeholder="Phone or email"
        hint={
          provider
            ? 'We let you know here whenever one of your drivers gets a ride request.'
            : 'Only needed if your organization has its own drivers.'
        }
        value={draft.notifications}
        error={errors.notifications}
        onChange={(e) => update({ notifications: e.target.value })}
      />
    </div>
  )
}

export function HouseStep({ draft, update, errors }: StepProps) {
  const house = draft.house
  const setHouse = (patch: Partial<RegisterDraft['house']>) => update({ house: { ...house, ...patch } })

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Add a house now?">
        <ChoiceCard
          name="addHouse"
          value="yes"
          checked={draft.addHouse}
          onChange={() => update({ addHouse: true })}
          title="Add one now"
          description="Recommended. It takes a minute."
        />
        <ChoiceCard
          name="addHouse"
          value="no"
          checked={!draft.addHouse}
          onChange={() => update({ addHouse: false })}
          title="Later"
          description="Add houses from your dashboard."
        />
      </div>

      {draft.addHouse && (
        <div className="animate-fade-up space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <TextField
            id="houseName"
            label="House name"
            icon={<Home className="h-5 w-5" />}
            placeholder="e.g. Belkin House"
            value={house.name}
            error={errors.houseName}
            onChange={(e) => setHouse({ name: e.target.value })}
            data-autofocus
          />
          <AddressPicker
            id="houseAddress"
            label="Street address"
            value={house.address}
            selected={Boolean(house.placeId)}
            error={errors.houseAddress}
            onQueryChange={(address) => setHouse({ address, placeId: undefined })}
            onSelect={(place) => setHouse({ address: place.address, city: place.city, placeId: place.id })}
          />
          <TextField
            id="housePhone"
            label="Front desk phone"
            type="tel"
            inputMode="tel"
            value={house.phone}
            error={errors.housePhone}
            onChange={(e) => setHouse({ phone: e.target.value })}
          />
          <TextField
            id="houseEmail"
            label="Sign-in email for this house"
            type="email"
            inputMode="email"
            optional
            icon={<Mail className="h-5 w-5" />}
            hint="Staff at the house share one account. We'll create a temporary password for it."
            value={house.email}
            error={errors.houseEmail}
            onChange={(e) => setHouse({ email: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}

export function DestinationsStep({ draft, update }: StepProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(CITIES[0])
  const [formError, setFormError] = useState<string>()

  const selected = new Set(draft.destinations.map((d) => d.key))
  const toggleSuggested = (key: string) => {
    const suggestion = SUGGESTED_DESTINATIONS.find((s) => s.key === key)!
    update({
      destinations: selected.has(key)
        ? draft.destinations.filter((d) => d.key !== key)
        : [...draft.destinations, suggestion],
    })
  }

  function addCustom() {
    if (!name.trim() || !address.trim()) {
      setFormError('Add a name and an address.')
      return
    }
    update({ destinations: [...draft.destinations, { key: crypto.randomUUID(), name: name.trim(), address: address.trim(), city }] })
    setName('')
    setAddress('')
    setFormError(undefined)
  }

  const custom = draft.destinations.filter((d) => !SUGGESTED_DESTINATIONS.some((s) => s.key === d.key))

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Popular places</legend>
        <div className="space-y-2">
          {SUGGESTED_DESTINATIONS.map((s, i) => {
            const on = selected.has(s.key)
            return (
              <label
                key={s.key}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 ${
                  on ? 'border-brand-500 bg-brand-50/60' : 'border-slate-200 bg-white hover:border-brand-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-brand-600"
                  checked={on}
                  onChange={() => toggleSuggested(s.key)}
                  data-autofocus={i === 0 ? '' : undefined}
                />
                <span className="flex-1">
                  <span className="block font-semibold text-ink">{s.name}</span>
                  <span className="block text-sm text-slate-500">{s.address}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {custom.length > 0 && (
        <ul className="space-y-2" aria-label="Places you added">
          {custom.map((d) => (
            <li key={d.key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <MapPin className="h-5 w-5 text-brand-600" aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold text-ink">{d.name}</span>
                <span className="block text-sm text-slate-500">{d.address}</span>
              </span>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${d.name}`}
                onClick={() => update({ destinations: draft.destinations.filter((x) => x.key !== d.key) })}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-4 rounded-2xl border border-dashed border-slate-300 p-5">
        <p className="font-semibold text-ink">Add another place</p>
        <TextField id="destName" label="Name" placeholder="e.g. Downtown Community Health Centre" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField id="destAddress" label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <SelectField id="destCity" label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectField>
        <FieldMessage id="dest-form-message" error={formError} />
        <button type="button" className={secondaryButton} onClick={addCustom}>
          <Plus className="h-5 w-5" aria-hidden /> Add place
        </button>
      </div>
    </div>
  )
}

export function VehicleStep({ draft, update, errors }: StepProps) {
  return <DriverVehicleFields value={draft.driver} onChange={(driver) => update({ driver })} errors={errors} />
}

export function RequestHoursStep({ draft, update, errors }: StepProps) {
  return <DriverRequestFields value={draft.driver} onChange={(driver) => update({ driver })} errors={errors} />
}

// ---- Review

function ReviewSection({ title, stepId, goTo, rows }: { title: string; stepId: string; goTo: (id: string) => void; rows: [string, string][] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold">{title}</h3>
        <button
          type="button"
          onClick={() => goTo(stepId)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          <Pencil className="h-4 w-4" aria-hidden /> Edit
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-sm text-slate-500">{k}</dt>
            <dd className="font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ReviewStep({ draft, goTo }: StepProps) {
  const d = draft.driver
  return (
    <div className="space-y-4">
      <ReviewSection
        title="Your account"
        stepId="account"
        goTo={goTo}
        rows={[
          ['Name', draft.name],
          ['Email', draft.email],
          ['Password', '•'.repeat(Math.min(draft.password.length, 12))],
          ...(draft.role === 'DRIVER' ? ([['Phone', d.phone]] as [string, string][]) : []),
        ]}
      />

      {draft.role !== 'DRIVER' && (
        <ReviewSection
          title="Organization"
          stepId="organization"
          goTo={goTo}
          rows={[
            ['Name', draft.orgName],
            ['Phone', draft.orgPhone],
            ...(draft.notifications ? ([['New bookings to', draft.notifications]] as [string, string][]) : []),
          ]}
        />
      )}

      {draft.role === 'PARTNER' && (
        <>
          <ReviewSection
            title="First house"
            stepId="house"
            goTo={goTo}
            rows={
              draft.addHouse
                ? [
                    ['House', draft.house.name],
                    ['Address', `${draft.house.address}, ${draft.house.city}`],
                    ['Phone', draft.house.phone],
                    ['Sign-in email', draft.house.email || 'Not set'],
                  ]
                : [['House', 'Adding later']]
            }
          />
          <ReviewSection
            title="Destinations"
            stepId="destinations"
            goTo={goTo}
            rows={[['Places', draft.destinations.map((x) => x.name).join(', ') || 'Adding later']]}
          />
        </>
      )}

      {draft.role === 'DRIVER' && (
        <>
          <ReviewSection
            title="Vehicle"
            stepId="vehicle"
            goTo={goTo}
            rows={[
              ['Vehicle', d.vehicle],
              ['Spaces', `${d.seats}${d.wheelchairAccessible ? ', wheelchair accessible' : ''}`],
              ['Cities', d.serviceCities.join(', ')],
            ]}
          />
          <ReviewSection
            title="Ride requests"
            stepId="requests"
            goTo={goTo}
            rows={[
              ['Send requests', describeRequestHours(d.requestHours)],
              ['Notice', formatNotice(d.minNoticeMinutes)],
            ]}
          />
        </>
      )}

      <p className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
        Every new account is reviewed by the CareRide team before rides can start. We'll let you know as soon as you're
        approved.
      </p>
    </div>
  )
}
