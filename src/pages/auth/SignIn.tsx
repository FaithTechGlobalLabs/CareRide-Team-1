import { ArrowRight, Building2, Car, Home, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { PasswordField } from '../../components/form/PasswordField'
import { TextField } from '../../components/form/TextField'
import { card, primaryButton, ROLE_TONE, tones } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { HOME_FOR, ROLE_LABELS } from '../../logic/homeFor'
import { dataService } from '../../services'
import { DEMO_EMAIL_DOMAIN, DEMO_PASSWORD } from '../../services/seed'
import type { User, UserRole } from '../../types'

const ROLE_ICONS: Record<UserRole, ReactNode> = {
  PLATFORM_ADMIN: <ShieldCheck className="h-5 w-5" />,
  ORG_ADMIN: <Building2 className="h-5 w-5" />,
  HOUSE: <Home className="h-5 w-5" />,
  DRIVER: <Car className="h-5 w-5" />,
}

const ROLE_ORDER: UserRole[] = ['HOUSE', 'DRIVER', 'ORG_ADMIN', 'PLATFORM_ADMIN']

export function SignIn() {
  const { users, currentUser, signIn } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState<string>() // which button is working

  const demoUsers = users
    .filter((u) => u.email?.endsWith(DEMO_EMAIL_DOMAIN))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

  function finish(user: User) {
    signIn(user)
    navigate(from ?? HOME_FOR[user.role], { replace: true })
  }

  async function attempt(key: string, emailValue: string, passwordValue: string) {
    setBusy(key)
    setError(undefined)
    try {
      finish(await dataService.signIn(emailValue, passwordValue))
    } catch (err) {
      setError((err as Error).message)
      setBusy(undefined)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    attempt('form', email, password)
  }

  return (
    <AuthShell
      width="xl"
      aside={
        <>
          <span className="hidden sm:inline">New to CareRide? </span>
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="animate-fade-up space-y-6">
        {currentUser && (
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm text-brand-900">
              You're signed in as <strong>{currentUser.name}</strong>.
            </p>
            <Link to={HOME_FOR[currentUser.role]} className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline">
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className={`${card} mx-auto max-w-md space-y-5 p-8`}>
          <div className="text-center">
            <img src="/assets/logo-mark.png" alt="" className="mx-auto mb-4 h-16 w-16" />
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-slate-600">Sign in to book or give rides.</p>
          </div>

          <TextField
            id="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            icon={<Mail className="h-5 w-5" />}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(undefined)
            }}
          />
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(undefined)
            }}
          />

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button type="submit" className={`${primaryButton} w-full`} disabled={!!busy}>
            {busy === 'form' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            {busy === 'form' ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-slate-500">Forgot your password? Ask your organization's admin to reset it.</p>
        </form>

        {demoUsers.length > 0 && (
          <section className={`${card} p-6`} aria-labelledby="demo-heading">
            <h2 id="demo-heading" className="text-lg font-extrabold">
              Try a demo account
            </h2>
            <p className="mb-4 text-sm text-slate-500">One tap to sign in. Demo password: {DEMO_PASSWORD}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {demoUsers.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => attempt(u.id, u.email!, DEMO_PASSWORD)}
                    className={`flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50/80 hover:shadow-sm ${tones[ROLE_TONE[u.role]].border} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:opacity-60`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[ROLE_TONE[u.role]].tile}`} aria-hidden>
                      {busy === u.id ? <Loader2 className="h-5 w-5 animate-spin" /> : ROLE_ICONS[u.role]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{u.name}</span>
                      <span className="block text-xs text-slate-500">{ROLE_LABELS[u.role]}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AuthShell>
  )
}
