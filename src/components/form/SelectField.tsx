import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { input, label as labelClass } from '../ui'
import { FieldMessage } from './FieldMessage'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string
  label: string
  hint?: string
  error?: string
}

export function SelectField({ id, label, hint, error, className = '', children, ...rest }: Props) {
  const messageId = `${id}-message`
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className={`${input} appearance-none pr-11`}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? messageId : undefined}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
}
