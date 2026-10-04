import { Check } from 'lucide-react'

interface Props {
  steps: { id: string; title: string }[]
  current: number
}

// Progress for a multi-step form: a bar on phones, a labelled list on larger screens.
export function Stepper({ steps, current }: Props) {
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
          const done = i < current
          const active = i === current
          return (
            <li
              key={step.id}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? 'bg-white shadow-sm' : ''}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                  done
                    ? 'bg-emerald-700 text-white'
                    : active
                      ? 'bg-brand-600 text-white'
                      : 'border-2 border-slate-300 text-slate-500'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} aria-label="Done" /> : i + 1}
              </span>
              <span className={`font-semibold ${active ? 'text-ink' : done ? 'text-slate-700' : 'text-slate-500'}`}>
                {step.title}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
