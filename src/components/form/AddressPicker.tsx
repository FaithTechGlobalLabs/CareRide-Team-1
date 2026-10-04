import { CheckCircle2, Loader2, MapPin } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { canSearchAddress, searchAddresses, type AddressSuggestion } from '../../services/addressSearch'
import { input, label as labelClass } from '../ui'
import { FieldMessage } from './FieldMessage'

const DEBOUNCE_MS = 280

type Props = {
  id: string
  label: string
  value: string
  selected: boolean
  error?: string
  hint?: string
  autoFocus?: boolean
  onQueryChange: (query: string) => void
  onSelect: (place: AddressSuggestion) => void
}

export function AddressPicker({
  id,
  label,
  value,
  selected,
  error,
  hint = 'Search and pick a matching address so drivers can find you.',
  autoFocus,
  onQueryChange,
  onSelect,
}: Props) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [results, setResults] = useState<AddressSuggestion[]>([])
  const [busy, setBusy] = useState(false)
  const [searchError, setSearchError] = useState<string>()

  useEffect(() => {
    if (selected || !canSearchAddress(value)) {
      setResults([])
      setBusy(false)
      setSearchError(undefined)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setBusy(true)
      setSearchError(undefined)
      try {
        const found = await searchAddresses(value, controller.signal)
        setResults(found)
        setActive(0)
        setOpen(true)
      } catch (err) {
        if (controller.signal.aborted) return
        setResults([])
        setSearchError(err instanceof Error ? err.message : 'Address search is unavailable right now.')
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [value, selected])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const showList = Boolean(open && !selected && (busy || searchError || canSearchAddress(value)))
  const messageId = `${id}-message`
  const describedBy = hint || error ? messageId : undefined

  function pick(place: AddressSuggestion) {
    onSelect(place)
    setOpen(false)
    setResults([])
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showList || results.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const place = results[active]
      if (place) pick(place)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400" aria-hidden>
          <MapPin className="h-5 w-5" />
        </span>
        <input
          id={id}
          role="combobox"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && results[active] ? `${id}-opt-${results[active].id}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${input} pl-11 pr-11`}
          placeholder="Start typing a street address"
          value={value}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (!selected && (results.length > 0 || canSearchAddress(value))) setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        {busy && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400" aria-hidden>
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
        )}
        {selected && !busy && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-emerald-600" aria-hidden>
            <CheckCircle2 className="h-5 w-5" />
          </span>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching addresses"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {searchError && (
            <li className="px-4 py-3 text-sm text-red-700" role="presentation">
              {searchError}
            </li>
          )}
          {!searchError && busy && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500" role="presentation">
              Searching…
            </li>
          )}
          {!searchError && !busy && results.length === 0 && canSearchAddress(value) && (
            <li className="px-4 py-3 text-sm text-slate-500" role="presentation">
              No matching street addresses. Try a house number and street.
            </li>
          )}
          {results.map((place, i) => (
            <li key={place.id} role="none">
              <button
                type="button"
                id={`${id}-opt-${place.id}`}
                role="option"
                aria-selected={i === active}
                className={`flex w-full flex-col items-start px-4 py-2.5 text-left ${
                  i === active ? 'bg-brand-50' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(place)}
              >
                {place.name && <span className="text-sm font-semibold text-ink">{place.name}</span>}
                <span className={place.name ? 'text-sm text-slate-600' : 'font-medium text-ink'}>{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && !error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          Confirmed address
        </p>
      )}
      <FieldMessage id={messageId} hint={selected ? undefined : hint} error={error} />
    </div>
  )
}
