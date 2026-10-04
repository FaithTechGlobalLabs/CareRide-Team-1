import { Navigate, Outlet } from 'react-router-dom'
import logoMark from '../assets/logo-mark.png'
import { useApp } from '../hooks/useApp'
import { isNative } from '../native/platform'

// Signed-in pages only. On the website, everyone else sees the marketing page.
// On the phone, they go to sign-in — sending them to "/" would bounce forever.
export function RequireAuth() {
  const { ready, currentUser } = useApp()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <img src={logoMark} alt="" className="h-16 w-16 animate-pulse" />
      </div>
    )
  }
  if (!currentUser) return <Navigate to={isNative ? '/signin' : '/'} replace />
  return <Outlet />
}
