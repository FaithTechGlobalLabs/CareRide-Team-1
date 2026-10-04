import { Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TextField } from './form/TextField'
import { dangerButton, secondaryButton } from './ui'
import { useApp } from '../hooks/useApp'
import { dataService } from '../services'
import type { User } from '../types'

const EFFECTS: Record<'DRIVER' | 'PARTNER', string> = {
  DRIVER:
    "You won't be able to sign in, and CareRide will stop sending you requests. Rides you've already finished stay on record. Requests waiting on you go to the next driver, and upcoming rides you accepted go back out to other drivers.",
  PARTNER:
    "Staff won't be able to sign in for this organization. Past rides stay on record. Rides that haven't started are cancelled, so drivers aren't sent to a pickup nobody is managing. A ride already on the way finishes as usual.",
}

// Asks the signed-in driver or partner to type their name before closing the account.
export function DeleteMyAccount({ user, onClose }: { user: User; onClose: () => void }) {
  const { signOut } = useApp()
  const dialog = useRef<HTMLDialogElement>(null)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const matches = typed.trim().toLowerCase() === user.name.trim().toLowerCase()
  const role = user.role === 'PARTNER' ? 'PARTNER' : 'DRIVER'

  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => node?.close()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!matches || busy) return
    setBusy(true)
    setError(undefined)
    try {
      await dataService.deleteMyAccount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
      return
    }
    try {
      await signOut()
    } catch {
      // The account is already closed. Signing out still leaves this page.
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-my-account-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-6 text-ink shadow-xl backdrop:bg-slate-900/50"
      onCancel={(e) => {
        if (busy) e.preventDefault()
        else onClose()
      }}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h2 id="delete-my-account-title" className="text-xl font-bold">
            Delete your account?
          </h2>
          <p className="mt-2 text-slate-700">{EFFECTS[role]}</p>
          <p className="mt-2 font-semibold text-slate-700">This can't be undone.</p>
        </div>
        <TextField
          id="confirm-delete-my-account"
          label={`Type "${user.name}" to confirm`}
          autoComplete="off"
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="grid gap-3 sm:flex sm:flex-row-reverse">
          <button type="submit" className={dangerButton} disabled={!matches || busy}>
            <Trash2 className="h-5 w-5" aria-hidden /> {busy ? 'Deleting…' : 'Delete account'}
          </button>
          <button type="button" className={secondaryButton} onClick={onClose} disabled={busy}>
            Go back
          </button>
        </div>
      </form>
    </dialog>
  )
}
