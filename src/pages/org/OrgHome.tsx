import { Navigate } from 'react-router-dom'
import { useCurrentOrg } from '../../hooks/useCurrent'

// Sends an org admin to the right starting page for their organization type.
export function OrgHome() {
  const org = useCurrentOrg()
  if (!org) return null
  return <Navigate to={org.type === 'TRANSPORT_PROVIDER' ? '/org/drivers' : '/org/houses'} replace />
}
