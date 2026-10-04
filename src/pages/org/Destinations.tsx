import { useState, type FormEvent } from 'react'
import { RequiredMark } from '../../components/form/RequiredMark'
import { TextField } from '../../components/form/TextField'
import { card, input, label, pageTitle, primaryButton } from '../../components/ui'
import { CITIES } from '../../constants'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { MAX_NAME, MAX_NOTE, tooLong } from '../../logic/validate'
import { dataService } from '../../services'

type Field = 'name' | 'address' | 'notes'

// Point B: the fixed places your clients travel to.
export function Destinations() {
  const { currentUser, refresh } = useApp()
  const orgId = currentUser?.orgId
  const destinations = useData(() => dataService.listDestinations(orgId), orgId)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(CITIES[0])
  const [notes, setNotes] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [saved, setSaved] = useState('')

  function validate(): Partial<Record<Field, string>> {
    const found: Partial<Record<Field, string>> = {}
    const n = name.trim()
    if (!n) found.name = 'Give the place a name staff will recognize.'
    else if (destinations?.some((d) => d.name.trim().toLowerCase() === n.toLowerCase())) found.name = 'You already have a place with this name.'
    else found.name = tooLong(n, MAX_NAME)
    const a = address.trim()
    if (!a) found.address = 'Add the street address.'
    else if (a.length < 5) found.address = 'Add the full street address, so drivers can find it.'
    else found.address = tooLong(a, MAX_NAME * 2)
    found.notes = tooLong(notes, MAX_NOTE)
    return Object.fromEntries(Object.entries(found).filter(([, v]) => v))
  }

  const errors = showErrors ? validate() : {}

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setShowErrors(true)
    const problems = validate()
    const first = (['name', 'address', 'notes'] as Field[]).find((f) => problems[f])
    if (first) {
      document.getElementById(`dest-${first}`)?.focus()
      return
    }
    await dataService.saveDestination({ orgId, name: name.trim(), address: address.trim(), city, notes: notes.trim() || undefined })
    setSaved(name.trim())
    setName('')
    setAddress('')
    setNotes('')
    setShowErrors(false)
    refresh()
  }

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Destinations</h1>
      <p>Places your clients often go. You pick from this list when booking a ride.</p>

      <div className="space-y-3">
        {destinations?.map((d) => (
          <div key={d.id} className={card}>
            <p className="text-lg font-semibold">{d.name}</p>
            <p className="text-slate-600">{d.address}</p>
            {d.notes && <p className="text-slate-600">{d.notes}</p>}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className={`${card} max-w-lg space-y-4`}>
        <h2 className="text-xl font-bold">Add a destination</h2>
        {saved && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            Saved {saved}.
          </p>
        )}
        <TextField
          id="dest-name"
          label="Name"
          required
          maxLength={MAX_NAME}
          placeholder="e.g. St. Paul's Hospital"
          value={name}
          error={errors.name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          id="dest-address"
          label="Address"
          required
          autoComplete="street-address"
          maxLength={MAX_NAME * 2}
          placeholder="e.g. 1081 Burrard St"
          value={address}
          error={errors.address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div>
          <label className={label} htmlFor="dest-city">
            City
            <RequiredMark />
          </label>
          <select id="dest-city" className={input} value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <TextField
          id="dest-notes"
          label="Notes for drivers"
          optional
          maxLength={MAX_NOTE}
          placeholder="e.g. Drop off at the main entrance"
          value={notes}
          error={errors.notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
          Save destination
        </button>
      </form>
    </div>
  )
}
