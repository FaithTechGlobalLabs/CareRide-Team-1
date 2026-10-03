import { ArrowRight, Check, KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CopyButton } from '../../../components/CopyButton'
import { primaryButton } from '../../../components/ui'
import { HOME_FOR } from '../../../logic/homeFor'
import type { User } from '../../../types'
import type { RegisterRole } from './draft'

export interface RegisterResult {
  user: User
  houseLogin?: { house: string; email: string; password: string }
}

const STEP_TILES = ['bg-violet-50 text-violet-700', 'bg-teal-50 text-teal-700', 'bg-coral-50 text-coral-700']

const NEXT_STEPS: Record<RegisterRole, string[]> = {
  PARTNER: [
    'The CareRide team reviews your organization.',
    'Meanwhile, add more houses and destinations from your dashboard.',
    'Once approved, your houses can start booking free rides.',
  ],
  PROVIDER: [
    'The CareRide team reviews your organization.',
    'Meanwhile, add your drivers and when they can drive.',
    'Once approved, ride requests start coming in.',
  ],
  DRIVER: [
    'The CareRide team checks your documents.',
    'Once approved, we’ll send ride requests during the hours you picked. Change them anytime in Settings.',
    'Accept the ones you can take. Decline the rest, no questions asked.',
  ],
}

export function Done({ result, role }: { result: RegisterResult; role: RegisterRole }) {
  const navigate = useNavigate()
  const firstName = result.user.name.split(' ')[0]

  return (
    <div className="animate-fade-up rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-10">
      <div className="mx-auto mb-6 flex h-20 w-20 animate-pop items-center justify-center rounded-full bg-fresh-gradient shadow-lg shadow-emerald-500/30">
        <Check className="h-10 w-10 text-white" strokeWidth={3} aria-hidden />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">You're all set, {firstName}!</h1>
      <p className="mt-2 text-lg text-slate-600">Your account is created and you're signed in.</p>

      <ol className="mt-8 space-y-3 text-left">
        {NEXT_STEPS[role].map((text, i) => (
          <li key={text} className="flex gap-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${STEP_TILES[i % STEP_TILES.length]}`}>
              {i + 1}
            </span>
            <span className="pt-0.5 text-slate-700">{text}</span>
          </li>
        ))}
      </ol>

      {result.houseLogin && (
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/70 p-5 text-left">
          <p className="mb-3 flex items-center gap-2 font-bold text-ink">
            <KeyRound className="h-5 w-5 text-brand-600" aria-hidden /> Sign-in for {result.houseLogin.house}
          </p>
          <dl className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-sm text-slate-500">Email</dt>
                <dd className="break-all font-semibold text-ink">{result.houseLogin.email}</dd>
              </div>
              <CopyButton text={result.houseLogin.email} label="email" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <dt className="text-sm text-slate-500">Temporary password</dt>
                <dd className="font-mono font-semibold text-ink">{result.houseLogin.password}</dd>
              </div>
              <CopyButton text={result.houseLogin.password} label="password" />
            </div>
          </dl>
          <p className="mt-3 text-sm text-slate-600">Share these with staff at the house. Save them now: you won't see the password again.</p>
        </div>
      )}

      <button
        type="button"
        className={`${primaryButton} mt-8 w-full`}
        onClick={() => navigate(HOME_FOR[result.user.role], { replace: true })}
        autoFocus
      >
        Go to my dashboard <ArrowRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  )
}
