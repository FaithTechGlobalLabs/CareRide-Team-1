import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { RequiredMark } from '../form/RequiredMark'
import { card } from '../ui'

interface Props {
  id: string
  step: number
  title: string
  description?: string
  required?: boolean
  done?: boolean // the step number turns into a green check
  children: ReactNode
}

// One numbered card in a long form. Required sections get a red star, the rest an "Optional" tag.
export function FormSection({ id, step, title, description, required, done, children }: Props) {
  const headingId = `${id}-heading`
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`${card} animate-fade-up scroll-mt-28 p-5 sm:p-6`}
      style={{ animationDelay: `${step * 60}ms` }}
    >
      <div className="mb-5 flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${
            done ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}
          aria-hidden
        >
          {done ? <Check className="h-4 w-4 animate-pop" strokeWidth={3} /> : step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-lg font-extrabold leading-8">
            {title}
            {required ? (
              <RequiredMark />
            ) : (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 align-middle font-sans text-xs font-semibold text-slate-500">
                Optional
              </span>
            )}
          </h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
