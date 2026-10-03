// Red star after a label. Screen readers hear "required" instead of "star".
export function RequiredMark() {
  return (
    <>
      <span className="ml-0.5 text-red-600" aria-hidden>
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  )
}
