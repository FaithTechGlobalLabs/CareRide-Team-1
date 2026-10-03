import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { tones, type Tone } from '../ui'

const CHECKED: Record<Tone, { card: string; solid: string }> = {
  brand: { card: 'border-brand-500 bg-brand-50/60 shadow-brand-500/10', solid: 'border-brand-600 bg-brand-600' },
  violet: { card: 'border-violet-500 bg-violet-50/60 shadow-violet-500/10', solid: 'border-violet-600 bg-violet-600' },
  coral: { card: 'border-coral-500 bg-coral-50/60 shadow-coral-500/10', solid: 'border-coral-600 bg-coral-600' },
  teal: { card: 'border-teal-500 bg-teal-50/60 shadow-teal-500/10', solid: 'border-teal-600 bg-teal-600' },
  amber: { card: 'border-amber-500 bg-amber-50/60 shadow-amber-500/10', solid: 'border-amber-600 bg-amber-600' },
}

interface Props {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  title: string
  description?: string
  icon?: ReactNode
  tone?: Tone
  autoFocus?: boolean
}

// A large radio option. Uses a real radio input, so arrow keys and screen readers work.
export function ChoiceCard({ name, value, checked, onChange, title, description, icon, tone = 'brand', autoFocus }: Props) {
  const on = CHECKED[tone]
  return (
    <label
      className={`group relative flex cursor-pointer items-start gap-4 rounded-2xl border-2 bg-white p-5 transition duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 ${
        checked
          ? `${on.card} shadow-md`
          : `border-slate-200 hover:bg-slate-50/60 ${tones[tone].border}`
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
        autoFocus={autoFocus}
        data-autofocus={autoFocus ? '' : undefined}
      />
      {icon && (
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition ${
            checked ? `${tones[tone].solid} shadow-md ${tones[tone].glow}` : tones[tone].tile
          }`}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span className="flex-1">
        <span className="block font-display text-lg font-extrabold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-slate-600">{description}</span>}
      </span>
      <span
        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          checked ? `${on.solid} text-white` : 'border-slate-300'
        }`}
        aria-hidden
      >
        {checked && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>
    </label>
  )
}
