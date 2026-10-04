import { Building2, Car, Mail, Pencil, User as UserIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  DriverAboutFields,
  DriverDocumentFields,
  DriverRequestFields,
  DriverVehicleFields,
} from '../../../components/DriverFields'
import type { FieldErrors } from '../../../components/driverDraft'
import { AddressPicker } from '../../../components/form/AddressPicker'
import { ChoiceCard } from '../../../components/form/ChoiceCard'
import { FieldMessage } from '../../../components/form/FieldMessage'
import { PasswordField } from '../../../components/form/PasswordField'
import { TextField } from '../../../components/form/TextField'
import { tones, type Tone } from '../../../components/ui'
import { BACKGROUND_LABELS } from '../../../constants'
import { describeRequestHours } from '../../../logic/requestHours'
import type { RegisterDraft, RegisterRole } from './draft'

export interface StepProps {
  draft: RegisterDraft
  update: (patch: Partial<RegisterDraft>) => void
  errors: FieldErrors
  goTo: (stepId: string) => void
}

const ROLES: { value: RegisterRole; title: string; description: string; icon: ReactNode; tone: Tone }[] = [
  {
    value: 'PARTNER',
    title: 'Partner organization',
    description: 'Book rides for the people you serve. For shelters, housing, and social service organizations.',
    icon: <Building2 className="h-6 w-6" />,
    tone: 'brand',
  },
  {
    value: 'DRIVER',
    title: 'Driver',
    description: 'Give free rides when it suits you. For taxi and rideshare drivers.',
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

export function AccountStep({ draft, update, errors, goTo }: StepProps) {
  const role = ROLES.find((r) => r.value === draft.role)
  return (
    <div className="space-y-5">
      {/* A saved draft reopens here, so say which sign-up this is and offer the way back to the other one */}
      {role && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[role.tone].tile}`} aria-hidden>
            {role.icon}
          </span>
          <p className="min-w-0 flex-1 text-sm text-slate-600">
            Signing up as a <span className="font-semibold text-ink">{role.title.toLowerCase()}</span>
          </p>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500"
            onClick={() => goTo('role')}
          >
            Change
          </button>
        </div>
      )}
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
    </div>
  )
}

export function OrganizationStep({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <TextField
        id="orgName"
        label="Organization name"
        autoComplete="organization"
        icon={<Building2 className="h-5 w-5" />}
        placeholder="e.g. Belkin House"
        hint="Use the name of the place rides start from."
        value={draft.orgName}
        error={errors.orgName}
        onChange={(e) => update({ orgName: e.target.value })}
        data-autofocus
      />
      <AddressPicker
        id="address"
        label="Street address"
        value={draft.address}
        selected={Boolean(draft.placeId)}
        error={errors.address}
        onQueryChange={(address) => update({ address, placeId: undefined })}
        onSelect={(place) => update({ address: place.address, city: place.city, placeId: place.id })}
      />
      <TextField
        id="orgPhone"
        label="Front desk phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="604-555-0123"
        hint="Drivers call this if they can't find the client."
        value={draft.orgPhone}
        error={errors.orgPhone}
        onChange={(e) => update({ orgPhone: e.target.value })}
      />
    </div>
  )
}

export function DriverAboutStep({ draft, update, errors }: StepProps) {
  return (
    <DriverAboutFields value={draft.driver} onChange={(driver) => update({ driver })} errors={errors} showName={false} />
  )
}

export function VehicleStep({ draft, update, errors }: StepProps) {
  return <DriverVehicleFields value={draft.driver} onChange={(driver) => update({ driver })} errors={errors} />
}

export function RequestHoursStep({ draft, update, errors }: StepProps) {
  return <DriverRequestFields value={draft.driver} onChange={(driver) => update({ driver })} errors={errors} />
}

export function DocumentsStep({ draft, update, errors }: StepProps) {
  return <DriverDocumentFields value={draft.driver} onChange={(driver) => update({ driver })} errors={errors} />
}

// ---- Review

// A few names and a count, so a long list doesn't take over the review
function summarizePlaces(names: string[]): string {
  if (!names.length) return 'Adding later'
  const shown = names.slice(0, 3).join(', ')
  return names.length > 3 ? `${shown}, and ${names.length - 3} more` : shown
}

function ReviewSection({ title, stepId, goTo, rows }: { title: string; stepId: string; goTo: (id: string) => void; rows: [string, string][] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
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
          [draft.role === 'PARTNER' ? 'Contact' : 'Name', draft.name],
          ['Email', draft.email],
          ['Password', '•'.repeat(Math.min(draft.password.length, 12))],
        ]}
      />

      {draft.role === 'PARTNER' && (
        <>
          <ReviewSection
            title="Organization"
            stepId="organization"
            goTo={goTo}
            rows={[
              ['Name', draft.orgName],
              ['Address', [draft.address, draft.city].filter(Boolean).join(', ')],
              ['Front desk', draft.orgPhone],
            ]}
          />
          <ReviewSection
            title="Destinations"
            stepId="destinations"
            goTo={goTo}
            rows={[['Places', summarizePlaces(draft.destinations.map((x) => x.name))]]}
          />
        </>
      )}

      {draft.role === 'DRIVER' && (
        <>
          <ReviewSection
            title="About you"
            stepId="about"
            goTo={goTo}
            rows={[
              ['Phone', d.phone],
              ['Drives as', BACKGROUND_LABELS[d.background]],
            ]}
          />
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
            rows={[['Send requests', describeRequestHours(d.requestHours)]]}
          />
          <ReviewSection
            title="Documents"
            stepId="documents"
            goTo={goTo}
            rows={[
              ['Licence', d.licenceFile ?? 'Missing'],
              ...(d.proofFile ? ([['Proof', d.proofFile]] as [string, string][]) : []),
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
