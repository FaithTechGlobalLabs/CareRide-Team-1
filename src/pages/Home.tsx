import { Link } from 'react-router-dom'
import { card, pageTitle, primaryButton } from '../components/ui'

export function Home() {
  return (
    <div>
      <h1 className={pageTitle}>Free rides to essential services</h1>
      <p className="mb-8 text-lg">
        Organizations request rides for their clients. Verified volunteer drivers give them for free.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h2 className="mb-2 text-xl font-bold">For organizations</h2>
          <p className="mb-4">Shelters, clinics, food banks, and charities.</p>
          <Link to="/signup/org" className={primaryButton}>
            Register an organization
          </Link>
        </div>
        <div className={card}>
          <h2 className="mb-2 text-xl font-bold">For drivers</h2>
          <p className="mb-4">Volunteer your time, including off-duty taxi or rideshare drivers.</p>
          <Link to="/signup/driver" className={primaryButton}>
            Become a driver
          </Link>
        </div>
      </div>
    </div>
  )
}
