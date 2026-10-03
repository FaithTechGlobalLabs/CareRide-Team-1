import { Link } from 'react-router-dom'
import { RideBoard } from '../../components/RideBoard'
import { primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useCurrentOrg } from '../../hooks/useCurrent'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

// Every ride booked by this organization's houses, whether the house or the org asked for it.
export function OrgRides() {
  const { currentUser } = useApp()
  const org = useCurrentOrg()
  const orgId = currentUser?.orgId ?? ''
  const rides = useData(() => dataService.listRidesRequestedByOrg(orgId), orgId) ?? []
  const houses = useData(() => dataService.listHouses(orgId), orgId) ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{org?.name ?? 'Your'} rides</h1>
        <Link to="/org/request" className={`${primaryButton} w-full sm:w-auto`}>
          Request a ride
        </Link>
      </div>

      <RideBoard rides={rides} houses={houses} />
    </div>
  )
}
