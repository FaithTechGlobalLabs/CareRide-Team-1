import { Flag } from 'lucide-react'
import { useRef, useState } from 'react'
import { useApp } from '../hooks/useApp'
import { MAX_FEEDBACK_NOTE } from '../logic/feedback'
import { dataService } from '../services'
import type { Ride, RideFeedback } from '../types'
import { ghostButton, hint, input, label, primaryButton } from './ui'

interface Props {
  ride: Ride
  flagged?: RideFeedback // what this driver already said about the ride
}

// Lets a driver tell CareRide something went wrong on a finished ride. The front desk doesn't see it.
export function FlagIssueButton({ ride, flagged }: Props) {
  const { refresh } = useApp()
  const dialog = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function open() {
    setNote(flagged?.note ?? '')
    setError('')
    dialog.current?.showModal()
  }

  async function send() {
    setSaving(true)
    setError('')
    try {
      await dataService.giveFeedback(ride.id, { note })
      dialog.current?.close()
    } catch (err) {
      setError((err as Error).message)
    }
    setSaving(false)
    refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-ink"
      >
        <Flag className="h-4 w-4" aria-hidden />
        {flagged ? 'Issue sent to CareRide · Edit' : 'Flag an issue'}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`flag-title-${ride.id}`}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl p-6 text-ink shadow-xl backdrop:bg-slate-900/50"
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <h2 id={`flag-title-${ride.id}`} className="text-xl font-bold">
            What went wrong?
          </h2>
          <p className="mt-2 text-slate-700">
            Only the CareRide team sees this, not the front desk. For an emergency, call 911.
          </p>
          <label htmlFor={`flag-note-${ride.id}`} className={`${label} mt-4`}>
            Ride to {ride.destinationName}
          </label>
          <textarea
            id={`flag-note-${ride.id}`}
            className={`${input} min-h-28 py-3`}
            maxLength={MAX_FEEDBACK_NOTE}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
          <p className={hint}>For example: the pickup address was wrong, or nobody was at the front desk.</p>
          {error && (
            <p role="alert" className="mt-3 text-red-700">
              {error}
            </p>
          )}
          <div className="mt-6 grid gap-3">
            <button type="submit" className={primaryButton} disabled={saving || !note.trim()}>
              Send to CareRide
            </button>
            <button type="button" className={ghostButton} onClick={() => dialog.current?.close()}>
              Go back
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
