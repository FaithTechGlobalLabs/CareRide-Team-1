import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../hooks/useApp'

// Signed-in pages only. Sends everyone else to sign in, then back here.
export function RequireAuth() {
  const { ready, currentUser, signedOut } = useApp()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <img src="/assets/logo-mark.png" alt="" className="h-16 w-16 animate-pulse" />
      </div>
    )
  }
  // After signing out on purpose, go home. Otherwise ask them to sign in, then come back.
  if (!currentUser && signedOut) return <Navigate to="/" replace />
  if (!currentUser) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
