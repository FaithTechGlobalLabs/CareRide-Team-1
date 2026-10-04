import { Navigate } from 'react-router-dom'
import { useCurrentOrg } from '../../hooks/useCurrent'

// A transport provider's admin starts on their drivers.
export function OrgHome() {
  const org = useCurrentOrg()
  if (!org) return null
  return <Navigate to="/org/drivers" replace />
}
