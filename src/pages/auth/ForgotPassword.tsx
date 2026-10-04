import { ArrowLeft, Mail, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { TextField } from '../../components/form/TextField'
import { primaryButton } from '../../components/ui'
import { EMAIL } from '../../logic/validate'
import { isNative } from '../../native/platform'
import { dataService } from '../../services'

const panel = 'animate-fade-up rounded-xl border border-slate-200/80 bg-white p-8 sm:p-10'

// "Forgot your password?": emails a reset link. Says the same thing whether or not the email has an account.
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) {
      setFieldError('Enter the email you sign in with.')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await dataService.requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div className={`${panel} text-center`} role="status">
          <MailCheck className="mx-auto h-12 w-12 text-brand-600" aria-hidden />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Check your email</h1>
          <p className="mt-2 text-lg text-slate-600">
            If <strong className="break-all">{email.trim()}</strong> has a CareRide account, we've sent it a link to choose a new
            password.
          </p>
          {isNative && (
            <p className="mt-4 text-slate-600">The link opens the CareRide website. Choose your new password there, then come back here and sign in.</p>
          )}
          <p className="mt-4 text-sm text-slate-500">Can't find it? Check your spam folder, or ask your organization's admin.</p>
          <Link to="/signin" className={`${primaryButton} mt-8 w-full`}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className={panel}>
          <h1 className="text-3xl font-extrabold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-slate-600">Enter the email you sign in with, and we'll send you a link to choose a new password.</p>
          <TextField
            id="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            className="mt-6"
            icon={<Mail className="h-5 w-5" />}
            value={email}
            error={fieldError}
            onChange={(e) => {
              setEmail(e.target.value)
              setFieldError(undefined)
              setError(undefined)
            }}
          />
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className={`${primaryButton} mt-6 w-full`} disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <Link to="/signin" className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  )
}
