import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../../components/auth/AuthShell'
import { Stepper } from '../../../components/auth/Stepper'
import { splitDriverDraft, type FieldErrors } from '../../../components/driverDraft'
import { ghostButton, primaryButton } from '../../../components/ui'
import { useApp } from '../../../hooks/useApp'
import { dataService } from '../../../services'
import { Done, type RegisterResult } from './Done'
import {
  emptyRegisterDraft,
  validateAccount,
  validateRequestHours,
  validateHouse,
  validateOrganization,
  validateRole,
  validateVehicle,
  type RegisterDraft,
  type RegisterRole,
} from './draft'
import {
  AccountStep,
  RequestHoursStep,
  DestinationsStep,
  HouseStep,
  OrganizationStep,
  ReviewStep,
  RoleStep,
  VehicleStep,
  type StepProps,
} from './steps'

type StepId =
  | 'role'
  | 'account'
  | 'organization'
  | 'house'
  | 'destinations'
  | 'vehicle'
  | 'requests'
  | 'review'

interface StepDef {
  title: string // short, for the progress list
  heading: (d: RegisterDraft) => string
  subtitle: (d: RegisterDraft) => string
  Component: (p: StepProps) => ReactNode
  validate?: (d: RegisterDraft) => FieldErrors
}

const STEPS: Record<StepId, StepDef> = {
  role: {
    title: 'Get started',
    heading: () => 'Welcome! How will you use CareRide?',
    subtitle: () => 'Pick the one that fits you best.',
    Component: RoleStep,
    validate: validateRole,
  },
  account: {
    title: 'Your account',
    heading: () => 'Create your account',
    subtitle: (d) => (d.role === 'DRIVER' ? 'This is how you’ll sign in to see ride requests.' : 'You’ll be the admin for your organization.'),
    Component: AccountStep,
    validate: validateAccount,
  },
  organization: {
    title: 'Organization',
    heading: () => 'Tell us about your organization',
    subtitle: (d) =>
      d.role === 'PROVIDER' ? 'Houses will see this name when your drivers accept a ride.' : 'This helps drivers know who they’re helping.',
    Component: OrganizationStep,
    validate: validateOrganization,
  },
  house: {
    title: 'First house',
    heading: () => 'Add your first house',
    subtitle: () => 'A house is where your residents live and where rides start. Each house gets one shared account.',
    Component: HouseStep,
    validate: validateHouse,
  },
  destinations: {
    title: 'Destinations',
    heading: () => 'Where do your residents usually go?',
    subtitle: () => 'These show up as one-tap choices when booking. You can change them anytime.',
    Component: DestinationsStep,
  },
  vehicle: {
    title: 'Vehicle',
    heading: () => 'Your vehicle',
    subtitle: () => 'We only send you rides your vehicle can take.',
    Component: VehicleStep,
    validate: validateVehicle,
  },
  requests: {
    title: 'Ride requests',
    heading: () => 'When should we send you requests?',
    subtitle: () =>
      'Pick the times you’re happy to hear about rides. You decide which ones to take, and can change this anytime from your dashboard.',
    Component: RequestHoursStep,
    validate: validateRequestHours,
  },
  review: {
    title: 'Review',
    heading: () => 'Everything look right?',
    subtitle: () => 'Check your details, then create your account.',
    Component: ReviewStep,
  },
}

const FLOWS: Record<RegisterRole, StepId[]> = {
  PARTNER: ['role', 'account', 'organization', 'house', 'destinations', 'review'],
  PROVIDER: ['role', 'account', 'organization', 'review'],
  DRIVER: ['role', 'account', 'vehicle', 'requests', 'review'],
}

const ROLE_PARAM: Record<string, RegisterRole> = { partner: 'PARTNER', provider: 'PROVIDER', driver: 'DRIVER' }

// The draft survives a refresh (but never the password).
const DRAFT_KEY = 'careride-register-draft-v3'

function loadDraft(roleParam: string | null): { draft: RegisterDraft; stepId: StepId } {
  const fromParam = roleParam ? ROLE_PARAM[roleParam] : undefined
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as { draft: RegisterDraft; stepId: StepId }
      const draft = { ...emptyRegisterDraft, ...saved.draft, password: '' }
      if (!fromParam || fromParam === draft.role) {
        const flow = FLOWS[draft.role ?? 'PARTNER']
        // Without the password, send them back to the account step at most
        const stepId = flow.indexOf(saved.stepId) > flow.indexOf('account') ? 'account' : saved.stepId
        return { draft, stepId: flow.includes(stepId) ? stepId : 'role' }
      }
    }
  } catch {
    // Ignore a missing or broken draft
  }
  return { draft: { ...emptyRegisterDraft, role: fromParam }, stepId: fromParam ? 'account' : 'role' }
}

function saveDraft(draft: RegisterDraft, stepId: StepId): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ draft: { ...draft, password: '' }, stepId }))
  } catch {
    // Ignore: the draft just won't survive a refresh
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // Ignore
  }
}

async function createAccount(d: RegisterDraft): Promise<RegisterResult> {
  if (d.role === 'DRIVER') {
    const [driverUser, driver] = splitDriverDraft({ ...d.driver, name: d.name.trim() })
    const { user } = await dataService.registerDriver(driverUser, driver, { email: d.email, password: d.password })
    return { user }
  }

  const { org, user } = await dataService.registerOrganization(
    {
      name: d.orgName.trim(),
      type: d.role === 'PROVIDER' ? 'TRANSPORT_PROVIDER' : 'PARTNER_ORG',
      contactName: d.name.trim(),
      contactPhone: d.orgPhone.trim(),
      bookingNotifications: d.notifications.trim() || undefined,
    },
    { name: d.name.trim(), email: d.email, password: d.password },
  )

  if (d.role !== 'PARTNER') return { user }

  let houseLogin: RegisterResult['houseLogin']
  if (d.addHouse) {
    const { house, tempPassword } = await dataService.addHouse(
      { orgId: org.id, name: d.house.name.trim(), address: d.house.address.trim(), city: d.house.city, phone: d.house.phone.trim() },
      d.house.email.trim() || undefined,
    )
    if (tempPassword) houseLogin = { house: house.name, email: d.house.email.trim().toLowerCase(), password: tempPassword }
  }
  for (const dest of d.destinations) {
    await dataService.saveDestination({ orgId: org.id, name: dest.name, address: dest.address, city: dest.city })
  }
  return { user, houseLogin }
}

export function Register() {
  const { signIn } = useApp()
  const [params] = useSearchParams()
  const [initial] = useState(() => loadDraft(params.get('role')))
  const [draft, setDraft] = useState(initial.draft)
  const [stepId, setStepId] = useState<StepId>(initial.stepId)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const [result, setResult] = useState<RegisterResult>()
  const panelRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  const flow = FLOWS[draft.role ?? 'PARTNER']
  const index = flow.indexOf(stepId)
  const step = STEPS[stepId]
  const isLast = stepId === 'review'

  useEffect(() => {
    if (!result) saveDraft(draft, stepId)
  }, [draft, stepId, result])

  // Move focus to the new step so keyboard and screen reader users land in the right place
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const panel = panelRef.current
    const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>('h1')
    target?.focus({ preventScroll: true })
  }, [stepId])

  function update(patch: Partial<RegisterDraft>) {
    setDraft((d) => ({ ...d, ...patch }))
    // Clear errors for whatever the person is fixing
    if (Object.keys(errors).length) setErrors({})
    setSubmitError(undefined)
  }

  function go(to: StepId, dir: 'forward' | 'back') {
    setDirection(dir)
    setErrors({})
    setStepId(to)
  }

  function focusFirstError() {
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  }

  async function asyncChecks(): Promise<FieldErrors> {
    if (stepId === 'account' && !(await dataService.isEmailAvailable(draft.email))) {
      return { email: 'An account with this email already exists. Try signing in instead.' }
    }
    if (stepId === 'house' && draft.addHouse && draft.house.email.trim()) {
      const same = draft.house.email.trim().toLowerCase() === draft.email.trim().toLowerCase()
      if (same || !(await dataService.isEmailAvailable(draft.house.email))) {
        return { houseEmail: 'This email is already used. Pick a different one for the house.' }
      }
    }
    return {}
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return

    const found = step.validate?.(draft) ?? {}
    if (Object.keys(found).length) {
      setErrors(found)
      focusFirstError()
      return
    }

    // Only show a loading state when we actually need to wait
    if (stepId === 'account' || stepId === 'house' || isLast) setBusy(true)
    try {
      const asyncFound = await asyncChecks()
      if (Object.keys(asyncFound).length) {
        setErrors(asyncFound)
        focusFirstError()
        return
      }
      if (!isLast) {
        go(flow[index + 1], 'forward')
        return
      }
      const created = await createAccount(draft)
      clearDraft()
      signIn(created.user)
      setResult(created)
    } catch (err) {
      setSubmitError((err as Error).message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <AuthShell>
        <Done result={result} role={draft.role ?? 'PARTNER'} />
      </AuthShell>
    )
  }

  const { Component } = step
  // On the very first step there's no path yet, so keep the page simple
  const showStepper = stepId !== 'role'

  return (
    <AuthShell
      width="wide"
      aside={
        <>
          <span className="hidden sm:inline">Already have an account? </span>
          <Link to="/signin" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className={showStepper ? 'grid gap-8 lg:grid-cols-[15rem_1fr]' : 'mx-auto max-w-2xl'}>
        {showStepper && (
          <aside className="lg:pt-24">
            <Stepper steps={flow.map((id) => ({ id, title: STEPS[id].title }))} current={index} />
          </aside>
        )}

        <form onSubmit={handleSubmit} noValidate className="min-w-0">
          <div
            ref={panelRef}
            key={stepId}
            className={`rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-10 ${
              direction === 'forward' ? 'animate-step-forward' : 'animate-step-back'
            }`}
          >
            <header className="mb-8">
              <h1 tabIndex={-1} className="text-3xl font-extrabold tracking-tight focus:outline-none sm:text-4xl">
                {step.heading(draft)}
              </h1>
              <p className="mt-2 text-lg text-slate-600">{step.subtitle(draft)}</p>
            </header>

            <Component draft={draft} update={update} errors={errors} goTo={(id) => go(id as StepId, 'back')} />

            {submitError && (
              <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
                {submitError}
              </p>
            )}

            <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {index > 0 ? (
                <button type="button" className={ghostButton} onClick={() => go(flow[index - 1], 'back')} disabled={busy}>
                  <ArrowLeft className="h-5 w-5" aria-hidden /> Back
                </button>
              ) : (
                <Link to="/" className={ghostButton}>
                  <ArrowLeft className="h-5 w-5" aria-hidden /> Home
                </Link>
              )}
              <button type="submit" className={`${primaryButton} sm:min-w-44`} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    {isLast ? 'Creating your account…' : 'Checking…'}
                  </>
                ) : isLast ? (
                  'Create account'
                ) : (
                  <>
                    {flow[index + 1] === 'review' ? 'Review' : 'Continue'} <ArrowRight className="h-5 w-5" aria-hidden />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AuthShell>
  )
}
