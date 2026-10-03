import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  type?: 'radio' | 'checkbox'
  name?: string
  checked: boolean
  onChange: () => void
  title: string
  description?: string
  icon?: ReactNode
  badge?: string
  dashed?: boolean // for an "add your own" option
  invalid?: boolean
  autoFocus?: boolean
}

// A compact selectable card. Uses a real radio or checkbox, so arrow keys, space, and screen readers work.
export function OptionTile({ type = 'radio', name, checked, onChange, title, description, icon, badge, dashed, invalid, autoFocus }: Props) {
  return (
    <label
      className={`group flex min-h-16 cursor-pointer select-none items-center gap-3 rounded-2xl border-2 px-4 py-3 transition duration-150 active:scale-[0.99] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 ${
        checked
          ? 'border-brand-500 bg-brand-50/70 shadow-md shadow-brand-500/10'
          : `bg-white hover:border-brand-300 hover:bg-slate-50/60 ${invalid ? 'border-red-300' : 'border-slate-200'} ${dashed ? 'border-dashed' : ''}`
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" autoFocus={autoFocus} />
      {icon && (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            checked ? 'bg-brand-gradient text-white shadow-md shadow-brand-500/25' : 'bg-brand-50 text-brand-600'
          }`}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2">
          <span className="font-semibold text-ink">{title}</span>
          {badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{badge}</span>}
        </span>
        {description && <span className="block truncate text-sm text-slate-500">{description}</span>}
      </span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 transition ${type === 'radio' ? 'rounded-full' : 'rounded-md'} ${
          checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
        }`}
        aria-hidden
      >
        {checked && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>
    </label>
  )
}
