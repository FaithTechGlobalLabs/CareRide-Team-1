import { useState, type FormEvent } from 'react'
import { input, label, pageTitle, primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { dataService } from '../../services'
import type { DriverBackground } from '../../types'

const CITIES = ['Vancouver', 'Richmond']

export function DriverSignUp() {
  const { refresh } = useApp()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [background, setBackground] = useState<DriverBackground>('INDEPENDENT')
  const [vehicle, setVehicle] = useState('')
  const [seats, setSeats] = useState(3)
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false)
  const [serviceCities, setServiceCities] = useState<string[]>([])
  const [licenceFile, setLicenceFile] = useState<string>()
  const [recordCheckFile, setRecordCheckFile] = useState<string>()
  const [submitted, setSubmitted] = useState(false)

  function toggleCity(city: string) {
    setServiceCities((cs) => (cs.includes(city) ? cs.filter((c) => c !== city) : [...cs, city]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Demo: only file names are stored, never the documents themselves
    await dataService.registerDriver(
      { name, phone },
      { background, vehicle, seats, wheelchairAccessible, serviceCities, licenceFile, recordCheckFile },
    )
    refresh()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div>
        <h1 className={pageTitle}>Thanks, {name}</h1>
        <p>A CareRide admin will check your documents. You'll get ride requests once you're approved.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <h1 className={pageTitle}>Become a volunteer driver</h1>

      <div>
        <label className={label} htmlFor="name">Your name</label>
        <input id="name" className={input} required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="phone">Phone</label>
        <input id="phone" type="tel" className={input} required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="background">I drive as…</label>
        <select id="background" className={input} value={background} onChange={(e) => setBackground(e.target.value as DriverBackground)}>
          <option value="INDEPENDENT">An independent volunteer</option>
          <option value="TAXI">A taxi driver</option>
          <option value="RIDESHARE">A rideshare driver</option>
          <option value="PARTNER_ORG">A driver for a partner organization</option>
        </select>
      </div>

      <h2 className="pt-4 text-xl font-bold">Your vehicle</h2>
      <div>
        <label className={label} htmlFor="vehicle">Vehicle (colour and type)</label>
        <input id="vehicle" className={input} required placeholder="e.g. White sedan" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="seats">Passenger seats</label>
        <input id="seats" type="number" min={1} max={8} className={input} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={wheelchairAccessible} onChange={(e) => setWheelchairAccessible(e.target.checked)} />
        Wheelchair accessible
      </label>
      <fieldset>
        <legend className={label}>Cities I can drive in</legend>
        {CITIES.map((city) => (
          <label key={city} className="flex items-center gap-2">
            <input type="checkbox" checked={serviceCities.includes(city)} onChange={() => toggleCity(city)} />
            {city}
          </label>
        ))}
      </fieldset>

      <h2 className="pt-4 text-xl font-bold">Verification</h2>
      <div>
        <label className={label} htmlFor="licence">Driver's licence</label>
        <input id="licence" type="file" required onChange={(e) => setLicenceFile(e.target.files?.[0]?.name)} />
      </div>
      <div>
        <label className={label} htmlFor="record-check">Criminal record check</label>
        <input id="record-check" type="file" required onChange={(e) => setRecordCheckFile(e.target.files?.[0]?.name)} />
      </div>

      <button type="submit" className={primaryButton}>Submit for review</button>
    </form>
  )
}
