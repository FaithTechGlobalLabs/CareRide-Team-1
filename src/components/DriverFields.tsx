import { Check, MapPin } from 'lucide-react'
import { CITIES } from '../constants'
import { KNOWN_PLACES } from '../logic/places'
import { needsProfessionalProof, type DriverDraft, type FieldErrors } from './driverDraft'
import { FileField } from './form/FileField'
import { FieldMessage } from './form/FieldMessage'
import { SelectField } from './form/SelectField'
import { TextField } from './form/TextField'
import { ToggleChip } from './form/ToggleChip'
import { RequestHoursEditor } from './RequestHoursEditor'
import { label as labelClass } from './ui'

interface SectionProps {
  value: DriverDraft
  onChange: (value: DriverDraft) => void
  errors?: FieldErrors
}

// What a typical trip looks like in each city, from the places partners send clients
const CITY_TRIPS: Record<string, string> = Object.fromEntries(
  CITIES.map((city) => {
    const places = KNOWN_PLACES.filter((p) => p.city === city)
    return [city, `${places.length} common destinations, like ${places[0].name}`]
  }),
)

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
}

export function DriverAboutFields({ value, onChange, errors = {} }: SectionProps) {
  return (
    <div className="space-y-5">
      <TextField
        id="driver-name"
        label="Full name"
        autoComplete="name"
        value={value.name}
        error={errors.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        data-autofocus
      />
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
      />
    </div>
  )
}

export function DriverVehicleFields({ value, onChange, errors = {}, lockCapacity = false }: SectionProps & { lockCapacity?: boolean }) {
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
      {lockCapacity ? (
        <p className="text-slate-700">
          <span className="font-semibold text-ink">
            {value.seats} {value.seats === 1 ? 'passenger space' : 'passenger spaces'}
            {value.wheelchairAccessible ? ' · Wheelchair accessible' : ''}
          </span>
          <span className="mt-1 block text-sm text-slate-500">
            Passenger spaces and wheelchair access stay as they were when CareRide approved you. Contact CareRide to change them.
          </span>
        </p>
      ) : (
        <>
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
        </>
      )}
      <fieldset aria-describedby="cities-message">
        <legend className={labelClass}>Cities you can drive in</legend>
        <p className="-mt-1 mb-3 text-sm text-slate-500">You’ll get requests for rides that start in these cities.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CITIES.map((city) => {
            const on = value.serviceCities.includes(city)
            return (
              <label
                key={city}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2 ${
                  on ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200 bg-white hover:border-brand-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => onChange({ ...value, serviceCities: toggle(value.serviceCities, city) })}
                />
                <MapPin className={`mt-0.5 h-5 w-5 shrink-0 ${on ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-extrabold text-ink">{city}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">{CITY_TRIPS[city]}</span>
                </span>
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                  }`}
                  aria-hidden
                >
                  {on && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
              </label>
            )
          })}
        </div>
        <FieldMessage id="cities-message" error={errors.serviceCities} />
      </fieldset>
    </div>
  )
}

// When to send this driver ride requests. They still choose which ones to accept.
export function DriverRequestFields({ value, onChange, errors = {} }: SectionProps) {
  return (
    <RequestHoursEditor
      value={value.requestHours}
      onChange={(requestHours) => onChange({ ...value, requestHours })}
      error={errors.requestHours}
    />
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

// Everything in one form, used when a transport provider adds one of its drivers.
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
      <section className="space-y-4">
        <h3 className="text-lg font-extrabold">Documents</h3>
        <DriverDocumentFields value={value} onChange={onChange} errors={errors} />
      </section>
    </div>
  )
}
