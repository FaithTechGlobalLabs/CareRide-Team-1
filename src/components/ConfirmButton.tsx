import { useRef, type ReactNode } from 'react'
import { primaryButton, secondaryButton } from './ui'

interface Props {
  className: string
  children: ReactNode // the button's label
  title: string // e.g. "Cancel this ride?"
  body?: ReactNode // what will happen, in plain words
  confirmLabel: string // e.g. "Yes, cancel the ride"
  confirmClassName?: string
  cancelLabel?: string
  disabled?: boolean
  onConfirm: () => void
}

// A button for actions that can't be undone. Asks once, in plain words, before acting.
export function ConfirmButton({
  className,
  children,
  title,
  body,
  confirmLabel,
  confirmClassName = primaryButton,
  cancelLabel = 'Go back',
  disabled,
  onConfirm,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl p-6 text-ink shadow-xl backdrop:bg-slate-900/50"
      >
        <h2 className="text-xl font-bold">{title}</h2>
        {body && <div className="mt-2 text-slate-700">{body}</div>}
        <div className="mt-6 grid gap-3 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className={confirmClassName}
            onClick={() => {
              dialog.current?.close()
              onConfirm()
            }}
          >
            {confirmLabel}
          </button>
          <button type="button" className={secondaryButton} onClick={() => dialog.current?.close()}>
            {cancelLabel}
          </button>
        </div>
      </dialog>
    </>
  )
}
