import { Check } from 'lucide-react'

interface Props {
  steps: { id: string; title: string }[]
  current: number
  furthest?: number
  onSelect?: (index: number) => void
  disabled?: boolean
}

// Progress for a multi-step form: a bar on phones, a labelled list on larger screens.
export function Stepper({ steps, current, furthest = current, onSelect, disabled }: Props) {
  const percent = Math.round(((current + 1) / steps.length) * 100)

  return (
    <nav aria-label="Registration progress">
      <div className="lg:hidden">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span className="text-ink">{steps[current]?.title}</span>
          <span className="text-slate-500">
            Step {current + 1} of {steps.length}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={`Step ${current + 1} of ${steps.length}`}
        >
          <div className="h-full rounded-full bg-brand-600 transition-all duration-500 ease-out" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ol className="hidden space-y-1 lg:block">
        {steps.map((step, i) => {
          const visited = i <= furthest
          const active = i === current
          const done = visited && !active
          const clickable = Boolean(onSelect) && visited && !active && !disabled
          const rowClass = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
            active ? 'bg-white shadow-sm' : clickable ? 'hover:bg-white hover:shadow-sm' : ''
          }`
          const marker = (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                done
                  ? 'bg-emerald-700 text-white'
                  : active
                    ? 'bg-brand-600 text-white'
                    : 'border-2 border-slate-300 text-slate-500'
              }`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} aria-label={clickable ? undefined : 'Done'} /> : i + 1}
            </span>
          )
          const label = (
            <span className={`font-semibold ${active ? 'text-ink' : done ? 'text-slate-700' : 'text-slate-500'}`}>
              {step.title}
            </span>
          )

          return (
            <li key={step.id} aria-current={active ? 'step' : undefined}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(i)}
                  className={`${rowClass} cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2`}
                  aria-label={`Edit ${step.title}`}
                >
                  {marker}
                  {label}
                </button>
              ) : (
                <div className={rowClass}>
                  {marker}
                  {label}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
