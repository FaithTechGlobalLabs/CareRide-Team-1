import { CheckCircle2, Upload } from 'lucide-react'
import { label as labelClass } from '../ui'
import { FieldMessage } from './FieldMessage'

interface Props {
  id: string
  label: string
  hint?: string
  error?: string
  fileName?: string
  onChange: (fileName: string | undefined) => void
}

// Demo: we only keep the file name. Real uploads come with the real backend.
export function FileField({ id, label, hint, error, fileName, onChange }: Props) {
  const messageId = `${id}-message`
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <label
        htmlFor={id}
        className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-4 py-3 transition has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2 ${
          error
            ? 'border-red-400 bg-red-50/40'
            : fileName
              ? 'border-emerald-400 bg-emerald-50/50'
              : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/40'
        }`}
      >
        <input
          id={id}
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? messageId : undefined}
          onChange={(e) => onChange(e.target.files?.[0]?.name)}
        />
        {fileName ? (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <Upload className="h-6 w-6 shrink-0 text-brand-600" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{fileName ?? 'Choose a file'}</span>
          <span className="block text-sm text-slate-500">{fileName ? 'Tap to replace' : 'Photo or PDF'}</span>
        </span>
      </label>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
}
