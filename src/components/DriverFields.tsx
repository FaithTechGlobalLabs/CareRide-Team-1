import { Car, HeartHandshake, Smartphone } from 'lucide-react'
import { CITIES, WEEKDAYS } from '../constants'
import { needsProfessionalProof, type DriverDraft, type FieldErrors } from './driverDraft'
import { ChoiceCard } from './form/ChoiceCard'
import { FileField } from './form/FileField'
import { FieldMessage } from './form/FieldMessage'
import { SelectField } from './form/SelectField'
import { TextField } from './form/TextField'
import { ToggleChip } from './form/ToggleChip'
import { label as labelClass } from './ui'

interface SectionProps {
  value: DriverDraft
  onChange: (value: DriverDraft) => void
  errors?: FieldErrors
}

const NOTICE_OPTIONS = [
  { hours: 1, text: '1 hour ahead' },
  { hours: 2, text: '2 hours ahead' },
  { hours: 4, text: '4 hours ahead' },
  { hours: 24, text: '1 day ahead' },
  { hours: 48, text: '2 days ahead' },
]

const BACKGROUNDS = [
  { value: 'TAXI', title: 'Taxi driver', description: 'I drive a taxi and want to give free rides in my own time.', icon: <Car className="h-6 w-6" /> },
  { value: 'RIDESHARE', title: 'Rideshare driver', description: 'I drive for a rideshare app and want to give free rides.', icon: <Smartphone className="h-6 w-6" /> },
  { value: 'INDEPENDENT', title: 'Independent volunteer', description: "I don't drive professionally, but I'd like to help.", icon: <HeartHandshake className="h-6 w-6" /> },
] as const

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
}

export function DriverAboutFields({
  value,
  onChange,
  errors = {},
  showName = true,
  showBackground = true,
}: SectionProps & { showName?: boolean; showBackground?: boolean }) {
  return (
    <div className="space-y-5">
      {showName && (
        <TextField
          id="driver-name"
          label="Full name"
          autoComplete="name"
          value={value.name}
          error={errors.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          data-autofocus
        />
      )}
      <TextField
        id="driver-phone"
        label="Mobile phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="604-555-0123"
        hint="We use this to reach you about a ride."
        value={value.phone}
        error={errors.phone}
        onChange={(e) => onChange({ ...value, phone: e.target.value })}
        data-autofocus={showName ? undefined : ''}
      />
      {showBackground && (
        <fieldset>
          <legend className={labelClass}>How do you drive?</legend>
          <div className="space-y-3" role="radiogroup">
            {BACKGROUNDS.map((b) => (
              <ChoiceCard
                key={b.value}
                name="background"
                value={b.value}
                checked={value.background === b.value}
                onChange={() => onChange({ ...value, background: b.value })}
                title={b.title}
                description={b.description}
                icon={b.icon}
              />
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}

export function DriverVehicleFields({ value, onChange, errors = {} }: SectionProps) {
  return (
    <div className="space-y-5">
      <TextField
        id="vehicle"
        label="Vehicle colour and type"
        placeholder="e.g. White sedan"
        hint="This is what the client looks for at pickup."
        value={value.vehicle}
        error={errors.vehicle}
        onChange={(e) => onChange({ ...value, vehicle: e.target.value })}
        data-autofocus
      />
      <SelectField
        id="seats"
        label="Spaces for passengers"
        value={value.seats}
        error={errors.seats}
        onChange={(e) => onChange({ ...value, seats: Number(e.target.value) })}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <option key={n} value={n}>
            {n} {n === 1 ? 'passenger' : 'passengers'}
          </option>
        ))}
      </SelectField>
      <fieldset>
        <legend className={labelClass}>Accessibility</legend>
        <ToggleChip
          checked={value.wheelchairAccessible}
          onChange={() => onChange({ ...value, wheelchairAccessible: !value.wheelchairAccessible })}
        >
          Wheelchair accessible
        </ToggleChip>
      </fieldset>
      <fieldset aria-describedby="cities-message">
        <legend className={labelClass}>Cities you can drive in</legend>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <ToggleChip
              key={city}
              checked={value.serviceCities.includes(city)}
              onChange={() => onChange({ ...value, serviceCities: toggle(value.serviceCities, city) })}
            >
              {city}
            </ToggleChip>
          ))}
        </div>
        <FieldMessage id="cities-message" error={errors.serviceCities} />
      </fieldset>
    </div>
  )
}

export function DriverAvailabilityFields({ value, onChange, errors = {} }: SectionProps) {
  const { availability } = value
  const setAvailability = (patch: Partial<DriverDraft['availability']>) =>
    onChange({ ...value, availability: { ...availability, ...patch } })

  return (
    <div className="space-y-6">
      <fieldset aria-describedby="days-message">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-semibold text-ink">Days you can drive</legend>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-semibold text-brand-700 hover:bg-brand-50"
              onClick={() => setAvailability({ days: [1, 2, 3, 4, 5] })}
            >
              Weekdays
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-semibold text-brand-700 hover:bg-brand-50"
              onClick={() => setAvailability({ days: [0, 1, 2, 3, 4, 5, 6] })}
            >
              Every day
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day, i) => (
            <ToggleChip
              key={day}
              checked={availability.days.includes(i)}
              onChange={() => setAvailability({ days: toggle(availability.days, i).sort() })}
            >
              {day}
            </ToggleChip>
          ))}
        </div>
        <FieldMessage id="days-message" error={errors.days} />
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          id="from"
          label="From"
          type="time"
          value={availability.from}
          error={errors.hours}
          onChange={(e) => setAvailability({ from: e.target.value })}
        />
        <TextField id="to" label="Until" type="time" value={availability.to} onChange={(e) => setAvailability({ to: e.target.value })} />
      </div>

      <SelectField
        id="notice"
        label="How much notice do you need?"
        hint="You'll only get requests booked at least this far ahead."
        value={value.minNoticeHours}
        onChange={(e) => onChange({ ...value, minNoticeHours: Number(e.target.value) })}
      >
        {NOTICE_OPTIONS.map((o) => (
          <option key={o.hours} value={o.hours}>
            {o.text}
          </option>
        ))}
      </SelectField>
    </div>
  )
}

export function DriverDocumentFields({ value, onChange, errors = {} }: SectionProps) {
  return (
    <div className="space-y-5">
      <FileField
        id="licence"
        label="Driver's licence"
        fileName={value.licenceFile}
        error={errors.licenceFile}
        onChange={(licenceFile) => onChange({ ...value, licenceFile })}
      />
      {needsProfessionalProof(value) && (
        <FileField
          id="proof"
          label="Proof you drive professionally"
          hint="For example, your taxi or rideshare permit."
          fileName={value.proofFile}
          error={errors.proofFile}
          onChange={(proofFile) => onChange({ ...value, proofFile })}
        />
      )}
    </div>
  )
}

// Everything in one form, used when an organization adds one of its own drivers.
export function DriverFields({ value, onChange, errors, showBackground = true }: SectionProps & { showBackground?: boolean }) {
  return (
    <div className="space-y-8">
      <DriverAboutFields value={value} onChange={onChange} errors={errors} showBackground={showBackground} />
      <section className="space-y-4">
        <h3 className="text-lg font-extrabold">Vehicle</h3>
        <DriverVehicleFields value={value} onChange={onChange} errors={errors} />
      </section>
      <section className="space-y-4">
        <h3 className="text-lg font-extrabold">Availability</h3>
        <DriverAvailabilityFields value={value} onChange={onChange} errors={errors} />
      </section>
      <section className="space-y-4">
        <h3 className="text-lg font-extrabold">Documents</h3>
        <DriverDocumentFields value={value} onChange={onChange} errors={errors} />
      </section>
    </div>
  )
}
