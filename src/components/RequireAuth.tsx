import { AlertCircle } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import logoMark from '../assets/logo-mark.png'
import { useApp } from '../hooks/useApp'
import { HOME_FOR } from '../logic/homeFor'
import { isNative } from '../native/platform'
import type { UserRole } from '../types'
import { primaryButton, secondaryButton } from './ui'

// Signed-in pages only. On the website, everyone else sees the marketing page.
// On the phone, they go to sign-in — sending them to "/" would bounce forever.
export function RequireAuth() {
  const { ready, currentUser, sessionError, retrySession, signOut } = useApp()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <img src={logoMark} alt="" className="h-16 w-16 animate-pulse" />
      </div>
    )
  }
  // Different from being signed out: the login may be fine but the account couldn't be loaded.
  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div role="alert" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-red-600" aria-hidden />
          <h1 className="mt-3 text-xl font-bold">We couldn't open your account</h1>
          <p className="mt-2 text-slate-600">{sessionError}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className={primaryButton} onClick={retrySession}>
              Try again
            </button>
            <button type="button" className={secondaryButton} onClick={() => void signOut()}>
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }
  if (!currentUser) return <Navigate to={isNative ? '/signin' : '/'} replace />
  return <Outlet />
}

// Pages for one kind of account. Anyone else is sent to their own home page.
// This is for usability only: the database's access rules are what actually protect data.
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { currentUser } = useApp()
  if (currentUser && !roles.includes(currentUser.role)) return <Navigate to={HOME_FOR[currentUser.role]} replace />
  return <Outlet />
}
