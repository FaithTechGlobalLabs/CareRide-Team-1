import { useState, type FormEvent } from 'react'
import { card, input, label, pageTitle, primaryButton } from '../../components/ui'
import { CITIES } from '../../constants'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

// Point B: the fixed places your residents travel to.
export function Destinations() {
  const { currentUser, refresh } = useApp()
  const orgId = currentUser?.orgId
  const destinations = useData(() => dataService.listDestinations(orgId), orgId)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(CITIES[0])
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    await dataService.saveDestination({ orgId, name, address, city, notes: notes || undefined })
    setName('')
    setAddress('')
    setNotes('')
    refresh()
  }

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Destinations</h1>
      <p>Places your residents go. Houses pick from this list when booking a ride.</p>

      <div className="space-y-3">
        {destinations?.map((d) => (
          <div key={d.id} className={card}>
            <p className="text-lg font-semibold">{d.name}</p>
            <p className="text-slate-600">{d.address}</p>
            {d.notes && <p className="text-slate-600">{d.notes}</p>}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={`${card} max-w-lg space-y-4`}>
        <h2 className="text-xl font-bold">Add a destination</h2>
        <div>
          <label className={label} htmlFor="dest-name">Name</label>
          <input id="dest-name" className={input} required placeholder="e.g. St. Paul's Hospital" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="dest-address">Address</label>
          <input id="dest-address" className={input} required value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="dest-city">City</label>
          <select id="dest-city" className={input} value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="dest-notes">Notes for drivers (optional)</label>
          <input id="dest-notes" className={input} placeholder="e.g. Drop off at the main entrance" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
          Save destination
        </button>
      </form>
    </div>
  )
}
