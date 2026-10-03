import { Minus, Plus } from 'lucide-react'

interface Props {
  labelId: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

const stepButton =
  'flex h-12 w-12 items-center justify-center text-slate-600 transition hover:bg-slate-50 hover:text-ink focus-visible:relative focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 active:scale-95 disabled:pointer-events-none disabled:opacity-35'

// A − / + counter. No typing, so there's no way to enter 0 or 120 by accident.
export function PassengerStepper({ labelId, value, onChange, min = 1, max = 12 }: Props) {
  return (
    <div role="group" aria-labelledby={labelId} className="inline-flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white">
      <button type="button" className={stepButton} aria-label="One fewer person" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="h-5 w-5" />
      </button>
      <output aria-live="polite" className="flex h-12 w-14 items-center justify-center border-x border-slate-200 font-display text-xl font-extrabold text-ink tabular-nums">
        {value}
      </output>
      <button type="button" className={stepButton} aria-label="One more person" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="h-5 w-5" />
      </button>
    </div>
  )
}
