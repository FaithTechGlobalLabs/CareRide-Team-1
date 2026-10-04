import { Pencil, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ConfirmButton } from '../../components/ConfirmButton'
import { RequiredMark } from '../../components/form/RequiredMark'
import { TextField } from '../../components/form/TextField'
import { card, dangerButton, ghostButton, input, label, pageTitle, primaryButton } from '../../components/ui'
import { CITIES } from '../../constants'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { MAX_NAME, MAX_NOTE, tooLong } from '../../logic/validate'
import { dataService } from '../../services'
import type { Destination } from '../../types'

type Field = 'name' | 'address' | 'notes'

// Point B: the fixed places your clients travel to.
export function Destinations() {
  const { currentUser, refresh } = useApp()
  const orgId = currentUser?.orgId
  const destinations = useData(() => dataService.listDestinations(orgId), orgId)

  const [editingId, setEditingId] = useState<string>()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(CITIES[0])
  const [notes, setNotes] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [saved, setSaved] = useState('')
  const [formError, setFormError] = useState<string>()
  const editing = editingId && destinations?.some((d) => d.id === editingId) ? editingId : undefined

  function validate(): Partial<Record<Field, string>> {
    const found: Partial<Record<Field, string>> = {}
    const n = name.trim()
    if (!n) found.name = 'Give the place a name staff will recognize.'
    else if (destinations?.some((d) => d.id !== editing && d.name.trim().toLowerCase() === n.toLowerCase()))
      found.name = 'You already have a place with this name.'
    else found.name = tooLong(n, MAX_NAME)
    const a = address.trim()
    if (!a) found.address = 'Add the street address.'
    else if (a.length < 5) found.address = 'Add the full street address, so drivers can find it.'
    else found.address = tooLong(a, MAX_NAME * 2)
    found.notes = tooLong(notes, MAX_NOTE)
    return Object.fromEntries(Object.entries(found).filter(([, v]) => v))
  }

  const errors = showErrors ? validate() : {}

  function clearForm() {
    setEditingId(undefined)
    setName('')
    setAddress('')
    setCity(CITIES[0])
    setNotes('')
    setShowErrors(false)
    setFormError(undefined)
  }

  function startEdit(d: Destination) {
    setEditingId(d.id)
    setName(d.name)
    setAddress(d.address)
    setCity(CITIES.includes(d.city) ? d.city : CITIES[0])
    setNotes(d.notes ?? '')
    setShowErrors(false)
    setSaved('')
    setFormError(undefined)
    document.getElementById('destination-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    requestAnimationFrame(() => document.getElementById('dest-name')?.focus())
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setShowErrors(true)
    setFormError(undefined)
    const problems = validate()
    const first = (['name', 'address', 'notes'] as Field[]).find((f) => problems[f])
    if (first) {
      document.getElementById(`dest-${first}`)?.focus()
      return
    }
    if (editingId && destinations && !destinations.some((d) => d.id === editingId)) {
      setEditingId(undefined)
      setFormError('That place is no longer on the list.')
      return
    }
    const changes = { name: name.trim(), address: address.trim(), city, notes: notes.trim() || undefined }
    try {
      if (editing) await dataService.updateDestination(editing, changes)
      else await dataService.saveDestination({ orgId, ...changes })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      return
    }
    setSaved(changes.name)
    clearForm()
    refresh()
  }

  async function remove(d: Destination) {
    setFormError(undefined)
    try {
      await dataService.deleteDestination(d.id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      return
    }
    if (editingId === d.id) clearForm()
    setSaved('')
    refresh()
  }

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Destinations</h1>
      <p>Places your clients often go. You pick from this list when booking a ride.</p>

      {formError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {formError}
        </p>
      )}

      <div className="space-y-3">
        {destinations?.map((d) => (
          <div key={d.id} className={card}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold">{d.name}</p>
                <p className="text-slate-600">{d.address}</p>
                {d.notes && <p className="text-slate-600">{d.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(d)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  aria-label={`Edit ${d.name}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden /> Edit
                </button>
                <ConfirmButton
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  label={`Remove ${d.name}`}
                  title={`Remove ${d.name}?`}
                  body="It comes off the list when you book a ride. Rides already booked keep their address."
                  confirmLabel="Remove place"
                  confirmClassName={dangerButton}
                  onConfirm={() => void remove(d)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove
                </ConfirmButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form id="destination-form" onSubmit={handleSubmit} noValidate className={`${card} max-w-lg scroll-mt-24 space-y-4`}>
        <h2 className="text-xl font-bold">{editing ? 'Change this place' : 'Add a destination'}</h2>
        {saved && !editing && (
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
          <select
            id="dest-city"
            className={input}
            value={city}
            onChange={(e) => {
              if (CITIES.includes(e.target.value)) setCity(e.target.value)
            }}
          >
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
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
            {editing ? 'Save changes' : 'Save destination'}
          </button>
          {editing && (
            <button type="button" className={`${ghostButton} w-full sm:w-auto`} onClick={clearForm}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
