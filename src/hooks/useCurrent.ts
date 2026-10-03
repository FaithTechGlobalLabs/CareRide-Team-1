import { dataService } from '../services'
import type { Driver, Organization } from '../types'
import { useApp } from './useApp'
import { useData } from './useData'

// The organization the signed-in user belongs to, if any.
export function useCurrentOrg(): Organization | undefined {
  const { currentUser } = useApp()
  const orgId = currentUser?.orgId
  const orgs = useData(() => dataService.listOrganizations(), orgId)
  return orgs?.find((o) => o.id === orgId)
}

// The driver profile of the signed-in user, if they are a driver.
export function useCurrentDriver(): Driver | undefined {
  const { currentUser } = useApp()
  const drivers = useData(() => dataService.listDrivers(), currentUser?.id)
  return drivers?.find((d) => d.userId === currentUser?.id)
}
