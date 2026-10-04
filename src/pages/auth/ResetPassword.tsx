import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoMark from '../../assets/logo-mark.png'
import { AuthShell } from '../../components/auth/AuthShell'
import { PasswordField } from '../../components/form/PasswordField'
import { primaryButton } from '../../components/ui'
import { MIN_PASSWORD_LENGTH } from '../../constants'
import { useApp } from '../../hooks/useApp'
import { HOME_FOR } from '../../logic/homeFor'
import { dataService } from '../../services'

const panel = 'animate-fade-up rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10'

// Where a reset email's link lands. Opening the link signs the person in for long enough to choose a new password.
export function ResetPassword() {
  const { ready, currentUser } = useApp()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found: typeof errors = {}
    if (password.length < MIN_PASSWORD_LENGTH) found.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    else if (confirm !== password) found.confirm = "The passwords don't match."
    setErrors(found)
    if (found.password || found.confirm || !currentUser) return
    setBusy(true)
    setError(undefined)
    try {
      await dataService.updatePassword(password)
      navigate(HOME_FOR[currentUser.role], { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <img src={logoMark} alt="" className="h-16 w-16 animate-pulse" />
      </div>
    )
  }

  return (
    <AuthShell>
      {!currentUser ? (
        <div className={`${panel} text-center`}>
          <h1 className="text-3xl font-extrabold tracking-tight">This link has expired</h1>
          <p className="mt-2 text-lg text-slate-600">Reset links work once and only for a short time. Ask for a new one.</p>
          <Link to="/forgot-password" className={`${primaryButton} mt-8 w-full`}>
            Send a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className={panel}>
          <h1 className="text-3xl font-extrabold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-slate-600">
            For <strong className="break-all">{currentUser.email ?? currentUser.name}</strong>. You'll use it next time you sign in.
          </p>
          <div className="mt-6 space-y-5">
            <PasswordField
              id="new-password"
              label="New password"
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              showStrength
              autoFocus
              value={password}
              error={errors.password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordField
              id="confirm-password"
              label="Type it again"
              autoComplete="new-password"
              value={confirm}
              error={errors.confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className={`${primaryButton} mt-6 w-full`} disabled={busy}>
            <KeyRound className="h-5 w-5" aria-hidden /> {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
