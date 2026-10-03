import { Check } from 'lucide-react'

interface Props {
  checked: boolean
  onChange: () => void
  children: string
}

// A pill-shaped checkbox, for picking days, cities, and other short options.
export function ToggleChip({ checked, onChange, children }: Props) {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-full border-2 px-4 font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 ${
        checked
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
      }`}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      {checked && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
      {children}
    </label>
  )
}
