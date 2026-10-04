import { Check, MapPin, Plus, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { FieldMessage } from '../../../components/form/FieldMessage'
import { SelectField } from '../../../components/form/SelectField'
import { TextField } from '../../../components/form/TextField'
import { ghostButton, input, primaryButton, secondaryButton } from '../../../components/ui'
import { CITIES } from '../../../constants'
import { KNOWN_PLACES, PLACE_GROUPS, type KnownPlace } from '../../../logic/places'
import { MAX_NAME, tooLong } from '../../../logic/validate'
import type { DestinationDraft } from './draft'
import type { StepProps } from './steps'

const KNOWN_KEYS = new Set(KNOWN_PLACES.map((p) => p.key))

function matches(place: KnownPlace, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !q || place.name.toLowerCase().includes(q) || place.address.toLowerCase().includes(q)
}

// One place as a checkbox card. The whole card is the target, and the check says it's on.
function PlaceOption({ place, on, onToggle, showCity }: { place: KnownPlace; on: boolean; onToggle: () => void; showCity: boolean }) {
  return (
    <label
      className={`flex h-full cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2 ${
        on ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200 bg-white hover:border-brand-300'
      }`}
    >
      <input type="checkbox" className="sr-only" checked={on} onChange={onToggle} />
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
          on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
        }`}
        aria-hidden
      >
        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug text-ink">{place.name}</span>
        <span className="mt-0.5 block text-sm text-slate-500">
          {place.address.replace(/, (Vancouver|Richmond)$/, '')}
          {showCity && `, ${place.city}`}
        </span>
      </span>
    </label>
  )
}

export function DestinationsStep({ draft, update }: StepProps) {
  // Start on the organization's own city: most trips stay close to home
  const [city, setCity] = useState(CITIES.includes(draft.city) ? draft.city : CITIES[0])
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [newCity, setNewCity] = useState(city)
  const [formError, setFormError] = useState<string>()

  const selected = new Set(draft.destinations.map((d) => d.key))
  const custom = draft.destinations.filter((d) => !KNOWN_KEYS.has(d.key))
  const searching = query.trim().length > 0

  const setPlaces = (places: DestinationDraft[]) => update({ destinations: places })
  const toggle = (place: KnownPlace) => {
    const { key, name, address, city } = place
    setPlaces(selected.has(key) ? draft.destinations.filter((d) => d.key !== key) : [...draft.destinations, { key, name, address, city }])
  }
  const setGroup = (places: KnownPlace[], on: boolean) => {
    const keys = new Set(places.map((p) => p.key))
    const rest = draft.destinations.filter((d) => !keys.has(d.key))
    setPlaces(on ? [...rest, ...places.map(({ key, name, address, city }) => ({ key, name, address, city }))] : rest)
  }

  // While searching, look across every city, so a place is found wherever it is
  const shown = KNOWN_PLACES.filter((p) => (searching ? matches(p, query) : p.city === city))
  const groups = PLACE_GROUPS.map((g) => ({ ...g, places: shown.filter((p) => p.group === g.id) })).filter((g) => g.places.length)
  const countIn = (c: string) => draft.destinations.filter((d) => d.city === c).length

  function openForm() {
    setAdding(true)
    setName(query.trim())
    setNewCity(city)
    setFormError(undefined)
  }

  function addCustom() {
    if (!name.trim() || !address.trim()) {
      setFormError('Add a name and an address.')
      return
    }
    const long = tooLong(name, MAX_NAME) ?? tooLong(address, MAX_NAME)
    if (long) {
      setFormError(long)
      return
    }
    if (address.trim().length < 5) {
      setFormError('Add the full street address, so drivers can find it.')
      return
    }
    if (!CITIES.includes(newCity)) {
      setFormError('Choose Vancouver or Richmond.')
      return
    }
    if (draft.destinations.some((d) => d.name.toLowerCase() === name.trim().toLowerCase())) {
      setFormError('You already added a place with this name.')
      return
    }
    setPlaces([...draft.destinations, { key: crypto.randomUUID(), name: name.trim(), address: address.trim(), city: newCity }])
    setName('')
    setAddress('')
    setQuery('')
    setFormError(undefined)
    setAdding(false)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            className={`${input} pl-12`}
            placeholder="Search places"
            aria-label="Search places"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-autofocus
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Which city's places to show. Hidden while searching, since search looks everywhere. */}
          {searching ? (
            <p className="text-sm text-slate-600">Showing matches in Vancouver and Richmond</p>
          ) : (
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1" role="group" aria-label="City">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={city === c}
                  onClick={() => setCity(c)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    city === c ? 'bg-white text-ink ring-1 ring-slate-200' : 'text-slate-600 hover:text-ink'
                  }`}
                >
                  {c}
                  {countIn(c) > 0 && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">{countIn(c)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <p className="text-sm font-semibold text-slate-600" aria-live="polite">
            {draft.destinations.length === 0
              ? 'None picked yet'
              : `${draft.destinations.length} ${draft.destinations.length === 1 ? 'place' : 'places'} picked`}
            {draft.destinations.length > 0 && (
              <>
                {' · '}
                <button type="button" className="rounded font-semibold text-brand-700 hover:underline" onClick={() => setPlaces([])}>
                  Clear
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {groups.map((g) => {
        const allOn = g.places.every((p) => selected.has(p.key))
        return (
          <fieldset key={g.id}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <legend className="font-display text-lg font-extrabold text-ink">{g.label}</legend>
              {g.places.length > 1 && (
                <button
                  type="button"
                  className="shrink-0 whitespace-nowrap rounded text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500"
                  aria-label={`${allOn ? 'Clear' : 'Pick all'} ${g.label.toLowerCase()}`}
                  onClick={() => setGroup(g.places, !allOn)}
                >
                  {allOn ? 'Clear these' : `Pick all ${g.places.length}`}
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.places.map((p) => (
                <PlaceOption key={p.key} place={p} on={selected.has(p.key)} onToggle={() => toggle(p)} showCity={searching} />
              ))}
            </div>
          </fieldset>
        )
      })}

      {searching && groups.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
          No listed places match “{query.trim()}”. You can add it below.
        </p>
      )}

      {custom.length > 0 && (
        <section aria-labelledby="custom-places">
          <h3 id="custom-places" className="mb-2 text-lg font-extrabold">
            Places you added
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {custom.map((d) => (
              <li key={d.key} className="flex items-start gap-3 rounded-xl border-2 border-brand-600 bg-brand-50/60 p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug text-ink">{d.name}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    {d.address}, {d.city}
                  </span>
                </span>
                <button
                  type="button"
                  className="-m-1 rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${d.name}`}
                  onClick={() => setPlaces(draft.destinations.filter((x) => x.key !== d.key))}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adding ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg font-extrabold text-ink">Add a place</p>
            <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-ink" aria-label="Cancel adding a place" onClick={() => setAdding(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <TextField id="destName" label="Name" placeholder="e.g. Downtown Community Health Centre" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <TextField id="destAddress" label="Street address" placeholder="e.g. 123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} />
            <SelectField
              id="destCity"
              label="City"
              value={newCity}
              onChange={(e) => {
                if (CITIES.includes(e.target.value)) setNewCity(e.target.value)
              }}
            >
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </SelectField>
          </div>
          <FieldMessage id="dest-form-message" error={formError} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} onClick={addCustom}>
              <Plus className="h-5 w-5" aria-hidden /> Add place
            </button>
            <button type="button" className={ghostButton} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${secondaryButton} w-full sm:w-auto`} onClick={openForm}>
          <Plus className="h-5 w-5" aria-hidden /> Add a place that isn’t listed
        </button>
      )}
    </div>
  )
}
