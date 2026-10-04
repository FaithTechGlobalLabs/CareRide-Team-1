import { CITIES } from '../constants'
import type { DriverDraft, FieldErrors } from './driverDraft'
import { FieldMessage } from './form/FieldMessage'
import { SelectField } from './form/SelectField'
import { TextField } from './form/TextField'
import { ToggleChip } from './form/ToggleChip'
import { NoticePicker, RequestHoursEditor } from './RequestHoursEditor'
import { label as labelClass } from './ui'

interface SectionProps {
  value: DriverDraft
  onChange: (value: DriverDraft) => void
  errors?: FieldErrors
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
}

export function DriverAboutFields({
  value,
  onChange,
  errors = {},
  showName = true,
}: SectionProps & { showName?: boolean }) {
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

// When to send this driver ride requests, and how much notice they need.
export function DriverRequestFields({ value, onChange, errors = {} }: SectionProps) {
  return (
    <div className="space-y-8">
      <RequestHoursEditor
        value={value.requestHours}
        onChange={(requestHours) => onChange({ ...value, requestHours })}
        error={errors.requestHours}
      />
      <NoticePicker value={value.minNoticeMinutes} onChange={(minNoticeMinutes) => onChange({ ...value, minNoticeMinutes })} />
    </div>
  )
}

// Everything in one form, used when an organization adds one of its own drivers.
export function DriverFields({ value, onChange, errors }: SectionProps) {
  return (
    <div className="space-y-8">
      <DriverAboutFields value={value} onChange={onChange} errors={errors} />
      <section className="space-y-4">
        <h3 className="text-lg font-extrabold">Vehicle</h3>
        <DriverVehicleFields value={value} onChange={onChange} errors={errors} />
      </section>
      <section className="space-y-4">
        <h3 className="text-lg font-extrabold">Ride requests</h3>
        <DriverRequestFields value={value} onChange={onChange} errors={errors} />
      </section>
    </div>
  )
}
