import { useState, type FormEvent } from 'react'
import { input, label, pageTitle, primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { dataService } from '../../services'
import type { OrgType } from '../../types'

export function OrgSignUp() {
  const { refresh } = useApp()
  const [name, setName] = useState('')
  const [type, setType] = useState<OrgType>('SOCIAL_SERVICE')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await dataService.registerOrganization({ name, type, contactName, contactPhone })
    refresh()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div>
        <h1 className={pageTitle}>Thanks for registering</h1>
        <p>A CareRide admin will review {name} shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <h1 className={pageTitle}>Register an organization</h1>
      <div>
        <label className={label} htmlFor="org-name">Organization name</label>
        <input id="org-name" className={input} required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <fieldset>
        <legend className={label}>We want to…</legend>
        <label className="flex items-center gap-2">
          <input type="radio" checked={type === 'SOCIAL_SERVICE'} onChange={() => setType('SOCIAL_SERVICE')} />
          Request rides for our clients
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={type === 'TRANSPORT_PROVIDER'}
            onChange={() => setType('TRANSPORT_PROVIDER')}
          />
          Provide rides (we have drivers or vehicles)
        </label>
      </fieldset>
      <div>
        <label className={label} htmlFor="contact-name">Contact name</label>
        <input id="contact-name" className={input} required value={contactName} onChange={(e) => setContactName(e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="contact-phone">Contact phone</label>
        <input id="contact-phone" type="tel" className={input} required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
      </div>
      <button type="submit" className={primaryButton}>Register</button>
    </form>
  )
}
