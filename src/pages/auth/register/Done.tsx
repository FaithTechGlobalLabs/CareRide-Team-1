import { ArrowRight, Check, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { primaryButton } from '../../../components/ui'
import { HOME_FOR } from '../../../logic/homeFor'
import type { Registration } from '../../../services/dataService'
import type { RegisterRole } from './draft'

export type RegisterResult = Registration

const STEP_TILES = ['bg-violet-50 text-violet-700', 'bg-teal-50 text-teal-700', 'bg-coral-50 text-coral-700']

const NEXT_STEPS: Record<RegisterRole, string[]> = {
  PARTNER: [
    'The CareRide team reviews your organization.',
    'Meanwhile, add the places your clients go from your dashboard.',
    'Once approved, your team can start booking free rides.',
  ],
  DRIVER: [
    'The CareRide team checks your documents.',
    'Once approved, we’ll send ride requests during the hours you picked. Change them anytime in Settings.',
    'Accept the ones you can take. Decline the rest, no questions asked.',
  ],
}

export function Done({ result, role }: { result: RegisterResult; role: RegisterRole }) {
  const navigate = useNavigate()

  // The account exists, but they prove the email is theirs before anyone is signed in.
  if (result.status === 'CONFIRM_EMAIL') {
    return (
      <div className="animate-fade-up rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-10">
        <div className="mx-auto mb-6 flex h-20 w-20 animate-pop items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Mail className="h-10 w-10" aria-hidden />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Check your email</h1>
        <p className="mt-2 text-lg text-slate-600">
          We sent a link to <strong className="break-all">{result.email}</strong>. Open it to confirm your email, then sign in.
          We'll finish setting up your account then.
        </p>
        <p className="mt-4 text-sm text-slate-500">Can't find it? Check your spam folder. The link works once.</p>
        <button type="button" className={`${primaryButton} mt-8 w-full`} onClick={() => navigate('/signin', { replace: true })} autoFocus>
          Go to sign in <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    )
  }

  const { user } = result
  const firstName = user.name.split(' ')[0]

  return (
    <div className="animate-fade-up rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-10">
      <div className="mx-auto mb-6 flex h-20 w-20 animate-pop items-center justify-center rounded-full bg-fresh-gradient shadow-lg shadow-emerald-500/30">
        <Check className="h-10 w-10 text-white" strokeWidth={3} aria-hidden />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">You're all set, {firstName}!</h1>
      <p className="mt-2 text-lg text-slate-600">Your account is created and you're signed in. It's waiting for review by the CareRide team.</p>

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

      <button
        type="button"
        className={`${primaryButton} mt-8 w-full`}
        onClick={() => navigate(HOME_FOR[user.role], { replace: true })}
        autoFocus
      >
        Go to my dashboard <ArrowRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  )
}
