import { Link } from 'react-router-dom'
import { ImpactCounter } from '../../components/ImpactCounter'
import { RideBoard } from '../../components/RideBoard'
import { primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

export function Dashboard() {
  const { currentUser } = useApp()
  const houseId = currentUser?.houseId ?? ''
  const rides = useData(() => dataService.listRidesForHouse(houseId), houseId) ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{currentUser?.name} rides</h1>
        <Link to="/house/request" className={`${primaryButton} w-full sm:w-auto`}>
          Request a ride
        </Link>
      </div>

      <ImpactCounter />

      <RideBoard rides={rides} />
    </div>
  )
}
