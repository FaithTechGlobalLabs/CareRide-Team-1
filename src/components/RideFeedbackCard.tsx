import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../hooks/useApp'
import { useData } from '../hooks/useData'
import { MAX_FEEDBACK_NOTE } from '../logic/feedback'
import { dataService } from '../services'
import type { FeedbackRating, Ride } from '../types'
import { card, ghostButton, hint, input, label, secondaryButton } from './ui'

const CHOICES: { rating: FeedbackRating; text: string; icon: typeof ThumbsUp; on: string }[] = [
  { rating: 'UP', text: 'It went well', icon: ThumbsUp, on: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
  { rating: 'DOWN', text: "It didn't go well", icon: ThumbsDown, on: 'border-red-600 bg-red-50 text-red-800' },
]

// After a ride: one tap for thumbs up or down, then an optional note. Only CareRide sees it, not the driver.
export function RideFeedbackCard({ ride }: { ride: Ride }) {
  const { refresh } = useApp()
  const mine = useData(() => dataService.listMyFeedback(), ride.id)
  const given = mine?.find((f) => f.rideId === ride.id)
  const [noteDraft, setNoteDraft] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(rating: FeedbackRating, note = given?.note) {
    setSaving(true)
    setError('')
    try {
      await dataService.giveFeedback(ride.id, { rating, note })
      setNoteDraft(undefined)
    } catch (err) {
      setError((err as Error).message)
    }
    setSaving(false)
    refresh()
  }

  const editingNote = noteDraft !== undefined

  return (
    <section className={`${card} no-print`} aria-labelledby="feedback-title">
      <h2 id="feedback-title" className="text-xl font-bold">
        {ride.status === 'NO_SHOW' ? 'How did it go with the driver?' : 'How did this ride go?'}
      </h2>
      <p className="mt-1 text-slate-600">Only the CareRide team sees this. The driver doesn't.</p>

      <div className="mt-4 grid gap-3 sm:flex">
        {CHOICES.map(({ rating, text, icon: Icon, on }) => {
          const chosen = given?.rating === rating
          return (
            <button
              key={rating}
              type="button"
              aria-pressed={chosen}
              disabled={saving || !mine}
              onClick={() => !chosen && void save(rating)}
              className={`${secondaryButton} ${chosen ? on : ''}`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {text}
            </button>
          )
        })}
        {saving && <Loader2 className="h-5 w-5 animate-spin self-center text-slate-400" aria-label="Saving" />}
      </div>

      {given?.rating && !editingNote && (
        <div className="mt-4" role="status">
          <p className="font-semibold text-ink">Thanks, we've noted it.</p>
          {given.note && <p className="mt-1 whitespace-pre-line text-slate-700">“{given.note}”</p>}
          <button type="button" className={`${ghostButton} -ml-3 mt-1`} onClick={() => setNoteDraft(given.note ?? '')}>
            {given.note ? 'Change the note' : given.rating === 'DOWN' ? 'Say what went wrong' : 'Add a note'}
          </button>
        </div>
      )}

      {given?.rating && editingNote && (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save(given.rating!, noteDraft)
          }}
        >
          <label htmlFor="feedback-note" className={label}>
            {given.rating === 'DOWN' ? 'What went wrong? (optional)' : 'Anything to add? (optional)'}
          </label>
          <textarea
            id="feedback-note"
            className={`${input} min-h-24 py-3`}
            maxLength={MAX_FEEDBACK_NOTE}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            autoFocus
          />
          <p className={hint}>For example: the driver was late, or very helpful with the walker.</p>
          <div className="mt-3 grid gap-3 sm:flex">
            <button type="submit" className={secondaryButton} disabled={saving}>
              Save note
            </button>
            <button type="button" className={ghostButton} onClick={() => setNoteDraft(undefined)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}
