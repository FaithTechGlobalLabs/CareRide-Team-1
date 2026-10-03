import { AlertCircle } from 'lucide-react'
import { hint as hintClass } from '../ui'

interface Props {
  id: string
  hint?: string
  error?: string
}

// Hint text under a field, replaced by the error when there is one.
export function FieldMessage({ id, hint, error }: Props) {
  if (error) {
    return (
      <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-600">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {error}
      </p>
    )
  }
  return hint ? (
    <p id={id} className={hintClass}>
      {hint}
    </p>
  ) : null
}
