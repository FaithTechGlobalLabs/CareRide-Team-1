import { Navigate, Outlet, useLocation } from 'react-router-dom'
import logoMark from '../assets/logo-mark.png'
import { useApp } from '../hooks/useApp'

// Signed-in pages only. Everyone else goes to the home page to sign in.
export function RequireAuth() {
  const { ready, currentUser } = useApp()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <img src={logoMark} alt="" className="h-16 w-16 animate-pulse" />
      </div>
    )
  }
  if (!currentUser) return <Navigate to="/" replace />
  return <Outlet />
}
