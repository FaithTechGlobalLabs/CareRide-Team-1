import { useState, type FormEvent } from 'react'
import { card, input, label, pageTitle, primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

export function Facilities() {
  const { currentUser, refresh } = useApp()
  const orgId = currentUser?.orgId
  const facilities = useData(() => dataService.listFacilities(orgId), orgId)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    await dataService.addFacility({ orgId, name, address, city, phone })
    setName('')
    setAddress('')
    setCity('')
    setPhone('')
    refresh()
  }

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Facilities</h1>

      <div className="space-y-3">
        {facilities?.map((f) => (
          <div key={f.id} className={card}>
            <p className="text-lg font-semibold">{f.name}</p>
            <p className="text-slate-600">
              {f.address}, {f.city} · {f.phone}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={`${card} max-w-lg space-y-4`}>
        <h2 className="text-xl font-bold">Add a facility</h2>
        <div>
          <label className={label} htmlFor="fac-name">Name</label>
          <input id="fac-name" className={input} required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="fac-address">Address</label>
          <input id="fac-address" className={input} required value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="fac-city">City</label>
          <input id="fac-city" className={input} required value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="fac-phone">Phone</label>
          <input id="fac-phone" type="tel" className={input} required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button type="submit" className={primaryButton}>Add facility</button>
      </form>
    </div>
  )
}
