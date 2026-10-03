import { Eye, EyeOff, Lock } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { input, label as labelClass } from '../ui'
import { FieldMessage } from './FieldMessage'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  id: string
  label: string
  hint?: string
  error?: string
  showStrength?: boolean
  value: string
}

function strength(password: string): { score: number; text: string } {
  if (!password) return { score: 0, text: '' }
  let score = password.length >= 8 ? 1 : 0
  if (password.length >= 12) score++
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  const text = ['Too short', 'Okay', 'Good', 'Strong', 'Very strong'][score]
  return { score, text }
}

const barColours = ['bg-red-500', 'bg-amber-500', 'bg-brand-500', 'bg-emerald-500', 'bg-emerald-600']

export function PasswordField({ id, label, hint, error, showStrength, value, className = '', ...rest }: Props) {
  const [visible, setVisible] = useState(false)
  const messageId = `${id}-message`
  const { score, text } = strength(value)

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 z-[1] flex items-center text-slate-400" aria-hidden>
          <Lock className="h-5 w-5" />
        </span>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`${input} pl-11 pr-12`}
          value={value}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? messageId : undefined}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-1 right-1 z-[1] flex w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2 flex items-center gap-3" aria-live="polite">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i < Math.max(score, 1) ? barColours[score] : 'bg-slate-200'}`}
              />
            ))}
          </div>
          <span className="w-24 text-right text-xs font-semibold text-slate-600">{text}</span>
        </div>
      )}
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
}
