import { Building2, Car, CheckCircle2, Eye, Home, KeyRound, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { CopyButton } from '../../components/CopyButton'
import { ChoiceCard } from '../../components/form/ChoiceCard'
import { PasswordField } from '../../components/form/PasswordField'
import { TextField } from '../../components/form/TextField'
import { ToggleChip } from '../../components/form/ToggleChip'
import { card, dangerButton, dangerOutlineButton, pageTitle, primaryButton, ROLE_TONE, secondaryButton, tones } from '../../components/ui'
import { MIN_PASSWORD_LENGTH } from '../../constants'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { HOME_FOR, ROLE_LABELS } from '../../logic/homeFor'
import { dataService } from '../../services'
import type { User, UserRole } from '../../types'
import { AccountDetails } from './AccountDetails'

const ROLE_ICONS: Record<UserRole, ReactNode> = {
  PLATFORM_ADMIN: <ShieldCheck className="h-5 w-5" />,
  ORG_ADMIN: <Building2 className="h-5 w-5" />,
  HOUSE: <Home className="h-5 w-5" />,
  DRIVER: <Car className="h-5 w-5" />,
}

const ROLE_ORDER: UserRole[] = ['HOUSE', 'DRIVER', 'ORG_ADMIN', 'PLATFORM_ADMIN']

// Lets a platform admin set a new password for someone who is locked out.
function ResetPanel({ user, isSelf, onClose }: { user: User; isSelf: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'temp' | 'custom'>('temp')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ email: string; password: string }>()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'custom' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      setResult(await dataService.resetPassword(user.id, mode === 'custom' ? password : undefined))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5" role="status">
        <p className="mb-3 flex items-center gap-2 font-bold text-ink">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> Password reset for {user.name}
        </p>
        <dl className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="break-all font-semibold text-ink">{result.email}</dd>
            </div>
            <CopyButton text={result.email} label="email" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <dt className="text-sm text-slate-500">New password</dt>
              <dd className="font-mono font-semibold text-ink">{result.password}</dd>
            </div>
            <CopyButton text={result.password} label="password" />
          </div>
        </dl>
        <p className="mt-3 text-sm text-slate-600">
          Share this with them directly, not by public message. Save it now: you won't see it again.
        </p>
        <button type="button" className={`${secondaryButton} mt-4 w-full sm:w-auto`} onClick={onClose}>
          Done
        </button>
      </div>
    )
  }

  const fieldName = `reset-mode-${user.id}`
  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5" noValidate>
      <fieldset className="space-y-3">
        <legend className="mb-2 font-semibold text-ink">New password for {user.name}</legend>
        <ChoiceCard
          name={fieldName}
          value="temp"
          checked={mode === 'temp'}
          onChange={() => setMode('temp')}
          title="Make a temporary password"
          description="Recommended. We'll create one for you to share."
          autoFocus
        />
        <ChoiceCard
          name={fieldName}
          value="custom"
          checked={mode === 'custom'}
          onChange={() => setMode('custom')}
          title="Choose a password"
          description="Type the new password yourself."
        />
      </fieldset>

      {mode === 'custom' && (
        <PasswordField
          id={`new-password-${user.id}`}
          label="New password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          showStrength
          value={password}
          error={error}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
      {mode === 'temp' && error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {isSelf && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          This is your own account. Use the new password next time you sign in.
        </p>
      )}

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <button type="submit" className={primaryButton} disabled={busy}>
          <KeyRound className="h-5 w-5" aria-hidden /> {busy ? 'Resetting…' : 'Reset password'}
        </button>
        <button type="button" className={secondaryButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// What deleting means for each type of account, shown before confirming.
const DELETE_EFFECTS: Record<UserRole, string> = {
  DRIVER:
    "Their driver profile is removed. Requests waiting on them go to the next driver, and upcoming rides they accepted go back out to other drivers.",
  HOUSE: "Staff can no longer sign in for this house. The house and its rides stay with the organization.",
  ORG_ADMIN: "They can no longer manage their organization. The organization, its houses, and its rides stay.",
  PLATFORM_ADMIN: "They lose access to approvals and accounts.",
}

// Asks the admin to type the account's name before deleting, since it can't be undone.
function DeletePanel({ user, onDeleted, onClose }: { user: User; onDeleted: () => void; onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const matches = typed.trim().toLowerCase() === user.name.trim().toLowerCase()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!matches) return
    setBusy(true)
    setError(undefined)
    try {
      await dataService.deleteAccount(user.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl border border-red-200 bg-red-50/60 p-5">
      <div>
        <p className="font-bold text-red-900">Delete {user.name}'s account?</p>
        <p className="mt-1 text-slate-700">{DELETE_EFFECTS[user.role]}</p>
        <p className="mt-1 font-semibold text-slate-700">This can't be undone.</p>
      </div>
      <TextField
        id={`confirm-delete-${user.id}`}
        label={`Type "${user.name}" to confirm`}
        autoComplete="off"
        autoFocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
      />
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-white p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <button type="submit" className={dangerButton} disabled={!matches || busy}>
          <Trash2 className="h-5 w-5" aria-hidden /> {busy ? 'Deleting…' : 'Delete account'}
        </button>
        <button type="button" className={secondaryButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function Accounts() {
  const { currentUser, refresh } = useApp()
  const accounts = useData(() => dataService.listAccounts()) ?? []
  const orgs = useData(() => dataService.listOrganizations()) ?? []
  const [query, setQuery] = useState('')
  const [roles, setRoles] = useState<UserRole[]>([])
  const [open, setOpen] = useState<{ id: string; action: 'reset' | 'delete' }>()
  const [deleted, setDeleted] = useState<string>()
  const [viewing, setViewing] = useState<User>()

  if (currentUser && currentUser.role !== 'PLATFORM_ADMIN') return <Navigate to={HOME_FOR[currentUser.role]} replace />

  const q = query.trim().toLowerCase()
  const shown = accounts
    .filter((u) => roles.length === 0 || roles.includes(u.role))
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name))

  const toggleRole = (role: UserRole) =>
    setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`${pageTitle} mb-2`}>Accounts</h1>
        <p className="text-slate-600">
          Everyone who can sign in to CareRide. Reset a password when someone is locked out, or delete an account that's no
          longer needed.
        </p>
      </div>

      <div className="space-y-3">
        <TextField
          id="account-search"
          label="Search"
          type="search"
          placeholder="Name or email"
          icon={<Search className="h-5 w-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by account type">
          {ROLE_ORDER.map((role) => (
            <ToggleChip key={role} checked={roles.includes(role)} onChange={() => toggleRole(role)}>
              {ROLE_LABELS[role]}
            </ToggleChip>
          ))}
        </div>
      </div>

      {deleted && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> Deleted {deleted}'s account.
          </p>
          <button
            type="button"
            className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-100"
            aria-label="Dismiss"
            onClick={() => setDeleted(undefined)}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}

      <p className="text-sm text-slate-500" aria-live="polite">
        {shown.length} {shown.length === 1 ? 'account' : 'accounts'}
      </p>

      <ul className="space-y-3">
        {shown.map((u) => {
          const tone = tones[ROLE_TONE[u.role]]
          const org = u.orgId && orgs.find((o) => o.id === u.orgId)?.name
          return (
            <li key={u.id} className={card}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.tile}`} aria-hidden>
                    {ROLE_ICONS[u.role]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-lg font-semibold text-ink">
                      {u.name}
                      {u.id === currentUser?.id && <span className="ml-2 text-sm font-normal text-slate-500">(you)</span>}
                    </p>
                    <p className="break-all text-slate-600">{u.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone.tile}`}>{ROLE_LABELS[u.role]}</span>
                      {org}
                    </p>
                  </div>
                </div>
                {open?.id !== u.id && (
                  <div className="grid gap-2 sm:flex sm:shrink-0">
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => setViewing(u)}
                      aria-label={`View ${u.name}'s details`}
                    >
                      <Eye className="h-5 w-5" aria-hidden /> Details
                    </button>
                    <button type="button" className={secondaryButton} onClick={() => setOpen({ id: u.id, action: 'reset' })}>
                      <KeyRound className="h-5 w-5" aria-hidden /> Reset password
                    </button>
                    {/* You can't delete the account you're signed in with */}
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        className={dangerOutlineButton}
                        onClick={() => setOpen({ id: u.id, action: 'delete' })}
                        aria-label={`Delete ${u.name}'s account`}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              {open?.id === u.id && open.action === 'reset' && (
                <ResetPanel user={u} isSelf={u.id === currentUser?.id} onClose={() => setOpen(undefined)} />
              )}
              {open?.id === u.id && open.action === 'delete' && (
                <DeletePanel
                  user={u}
                  onClose={() => setOpen(undefined)}
                  onDeleted={() => {
                    setOpen(undefined)
                    setDeleted(u.name)
                    refresh()
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>
      {shown.length === 0 && <p>No accounts match.</p>}

      {viewing && <AccountDetails user={viewing} isSelf={viewing.id === currentUser?.id} onClose={() => setViewing(undefined)} />}
    </div>
  )
}
