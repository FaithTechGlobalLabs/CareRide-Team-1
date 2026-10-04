import { AlertCircle, ArrowRight, Building2, Car, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import logoMark from '../../assets/logo-mark.png'
import { AuthShell } from '../../components/auth/AuthShell'
import { CopyButton } from '../../components/CopyButton'
import { PasswordField } from '../../components/form/PasswordField'
import { TextField } from '../../components/form/TextField'
import { primaryButton, ROLE_TONE, tones } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { HOME_FOR } from '../../logic/homeFor'
import { EMAIL } from '../../logic/validate'
import { dataService } from '../../services'
import { DEMO_EMAIL_DOMAIN, DEMO_PASSWORD } from '../../services/seed'
import type { User, UserRole } from '../../types'

// The two kinds of people who sign in. Picking one first keeps the page about them.
type Audience = 'PARTNER' | 'DRIVER'

const AUDIENCES: Record<Audience, { label: string; icon: ReactNode; subtitle: string; register: string; registerLabel: string }> = {
  PARTNER: {
    label: 'Partner organization',
    icon: <Building2 className="h-5 w-5" />,
    subtitle: 'Sign in to book and track rides for the people you serve.',
    register: '/register?role=partner',
    registerLabel: 'Register your organization',
  },
  DRIVER: {
    label: 'Driver',
    icon: <Car className="h-5 w-5" />,
    subtitle: 'Sign in to see ride requests and your trips.',
    register: '/register?role=driver',
    registerLabel: 'Become a driver',
  },
}

// Demo accounts, grouped by what each kind of account does.
const ROLE_GROUPS: { role: UserRole; title: string; text: string; icon: ReactNode }[] = [
  { role: 'PARTNER', title: 'Partner organizations', text: 'Book rides for clients and track them.', icon: <Building2 className="h-5 w-5" /> },
  { role: 'DRIVER', title: 'Drivers', text: 'Accept ride requests and drive trips.', icon: <Car className="h-5 w-5" /> },
  { role: 'PLATFORM_ADMIN', title: 'CareRide admin', text: 'Approve organizations and drivers.', icon: <ShieldCheck className="h-5 w-5" /> },
]

// Remembers who last signed in on this device, so returning staff only type a password.
const LAST_EMAIL_KEY = 'careride:last-email'

function readLastEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch {
    return '' // storage blocked, e.g. a private window
  }
}

function saveLastEmail(email: string) {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email)
  } catch {
    // Nothing to do: the next visit just starts with an empty email.
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function focusField(id: string) {
  const el = document.getElementById(id) as HTMLInputElement | null
  el?.focus()
  el?.select()
}

type Pane = 'form' | 'demo'

export function SignIn() {
  const { users, currentUser, signIn } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [rememberedEmail] = useState(readLastEmail)
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string>()
  const [attempts, setAttempts] = useState(0) // replays the shake on each failed try
  const [busy, setBusy] = useState<string>() // which button is working
  const [params] = useSearchParams()
  // Phones show one side at a time. /signin?demo opens on the demo accounts.
  const [pane, setPane] = useState<Pane>(() => (params.has('demo') ? 'demo' : 'form'))
  // /signin?as=driver opens on the driver side
  const [audience, setAudience] = useState<Audience>(() => (params.get('as') === 'driver' ? 'DRIVER' : 'PARTNER'))
  const who = AUDIENCES[audience]

  // The chosen kind of account comes first; the admin is always last
  const demoUsers = users.filter((u) => u.email?.endsWith(DEMO_EMAIL_DOMAIN))
  const groups = ROLE_GROUPS.map((g) => ({ ...g, users: demoUsers.filter((u) => u.role === g.role) }))
    .filter((g) => g.users.length > 0)
    .sort((a, b) => Number(b.role === audience) - Number(a.role === audience))
  const hasDemo = groups.length > 0

  function finish(user: User) {
    signIn(user)
    navigate(from ?? HOME_FOR[user.role], { replace: true })
  }

  async function attempt(key: string, emailValue: string, passwordValue: string) {
    setBusy(key)
    setError(undefined)
    try {
      const user = await dataService.signIn(emailValue, passwordValue)
      if (key === 'form') saveLastEmail(emailValue)
      finish(user)
    } catch (err) {
      setError((err as Error).message)
      setAttempts((n) => n + 1)
      setBusy(undefined)
      if (key === 'form') requestAnimationFrame(() => focusField('password'))
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found: typeof fieldErrors = {}
    if (!email.trim()) found.email = 'Enter your email.'
    else if (!EMAIL.test(email.trim())) found.email = "That doesn't look like an email. Check for typos."
    if (!password) found.password = 'Enter your password.'
    setFieldErrors(found)
    if (found.email) return focusField('email')
    if (found.password) return focusField('password')
    attempt('form', email.trim(), password)
  }

  const formPane = (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col p-6 sm:p-10">
      <div className="my-auto">
        <img src={logoMark} alt="" className="mb-5 h-14 w-14" />
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome back</h1>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="radiogroup" aria-label="I'm signing in as a">
          {(Object.keys(AUDIENCES) as Audience[]).map((a) => {
            const on = audience === a
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setAudience(a)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 ${
                  on ? `bg-white text-ink shadow-md` : 'text-slate-500 hover:text-ink'
                }`}
              >
                <span className={on ? tones[ROLE_TONE[a]].text : ''} aria-hidden>
                  {AUDIENCES[a].icon}
                </span>
                {AUDIENCES[a].label}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-slate-600">{who.subtitle}</p>

        <div className="mt-8 space-y-5">
          <TextField
            id="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus={!rememberedEmail}
            placeholder="you@example.org"
            icon={<Mail className="h-5 w-5" />}
            value={email}
            error={fieldErrors.email}
            onChange={(e) => {
              setEmail(e.target.value)
              setFieldErrors((f) => ({ ...f, email: undefined }))
              setError(undefined)
            }}
          />
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            autoFocus={!!rememberedEmail}
            value={password}
            error={fieldErrors.password}
            onChange={(e) => {
              setPassword(e.target.value)
              setFieldErrors((f) => ({ ...f, password: undefined }))
              setError(undefined)
            }}
          />
        </div>

        {error && (
          <p key={attempts} role="alert" className="mt-5 flex animate-shake items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <button type="submit" className={`${primaryButton} mt-6 w-full`} disabled={!!busy}>
          {busy === 'form' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-5 w-5" aria-hidden />
            </>
          )}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">Forgot your password? Ask your organization's admin to reset it.</p>
      </div>

      <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
        New to CareRide?{' '}
        <Link to={who.register} className="font-semibold text-brand-700 hover:underline">
          {who.registerLabel}
        </Link>
      </p>
    </form>
  )

  const demoPane = (
    <section aria-labelledby="demo-heading" className="h-full bg-gradient-to-br from-brand-50/80 via-white to-violet-50/80 p-6 sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Demo
      </span>
      <h2 id="demo-heading" className="mt-3 text-2xl font-extrabold tracking-tight">
        Look around first
      </h2>
      <p className="mt-1 text-sm text-slate-600">Tap anyone below to sign in as them. No password needed.</p>

      <ul className="mt-5 space-y-2.5">
        {groups.map((g) => {
          const tone = tones[ROLE_TONE[g.role]]
          return (
            <li key={g.role} className="rounded-2xl bg-white/90 p-3.5 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.tile}`} aria-hidden>
                  {g.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold leading-tight">{g.title}</h3>
                  <p className="text-sm text-slate-500">{g.text}</p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {g.users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={!!busy}
                    onClick={() => attempt(u.id, u.email!, DEMO_PASSWORD)}
                    aria-label={`Sign in as ${u.name}`}
                    className={`group inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-3 text-left text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:pointer-events-none disabled:opacity-60 ${tone.border}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tone.solid}`} aria-hidden>
                      {busy === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : initials(u.name)}
                    </span>
                    {u.name}
                    <ArrowRight className="-ml-2 h-4 w-0 text-slate-400 opacity-0 transition-all group-hover:ml-0 group-hover:w-4 group-hover:opacity-100" aria-hidden />
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/80 py-1.5 pl-3 pr-1.5 text-sm text-slate-600 ring-1 ring-slate-200/80">
        <span>
          Typing it in instead? Password: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-ink">{DEMO_PASSWORD}</code>
        </span>
        <CopyButton text={DEMO_PASSWORD} label="demo password" />
      </div>
    </section>
  )

  return (
    <AuthShell
      width="wide"
      aside={
        <>
          <span className="hidden sm:inline">New to CareRide? </span>
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="animate-fade-up space-y-5">
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

        {hasDemo && (
          <div className="mx-auto grid max-w-sm grid-cols-2 gap-1 rounded-2xl bg-white/70 p-1 shadow-sm ring-1 ring-slate-200 backdrop-blur lg:hidden" role="group" aria-label="Show">
            {(['form', 'demo'] as Pane[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={pane === p}
                onClick={() => setPane(p)}
                className={`min-h-11 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 ${
                  pane === p ? 'bg-white text-ink shadow-md' : 'text-slate-500 hover:text-ink'
                }`}
              >
                {p === 'form' ? 'Sign in' : 'Try a demo'}
              </button>
            ))}
          </div>
        )}

        <div
          className={`mx-auto grid overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_48px_-20px_rgba(16,24,40,0.18)] ${
            hasDemo ? 'max-w-5xl lg:grid-cols-2' : 'max-w-md'
          }`}
        >
          <div className={pane === 'form' || !hasDemo ? 'flex' : 'hidden lg:flex'}>{formPane}</div>
          {hasDemo && <div className={`lg:border-l lg:border-slate-100 ${pane === 'demo' ? '' : 'hidden lg:block'}`}>{demoPane}</div>}
        </div>
      </div>
    </AuthShell>
  )
}
