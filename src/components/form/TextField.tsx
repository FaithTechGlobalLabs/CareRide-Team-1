import type { InputHTMLAttributes, ReactNode } from 'react'
import { input, label as labelClass } from '../ui'
import { FieldMessage } from './FieldMessage'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  hint?: string
  error?: string
  optional?: boolean
  icon?: ReactNode // shown inside the field, on the left
}

export function TextField({ id, label, hint, error, optional, icon, className = '', ...rest }: Props) {
  const messageId = `${id}-message`
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {optional && <span className="ml-1 font-normal text-slate-500">(optional)</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400" aria-hidden>
            {icon}
          </span>
        )}
        <input
          id={id}
          className={`${input} ${icon ? 'pl-11' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? messageId : undefined}
          {...rest}
        />
      </div>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
}
