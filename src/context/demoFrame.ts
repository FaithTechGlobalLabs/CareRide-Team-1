// The /demo deck shows the real app in frames, one per role. Frames share the tab's sessionStorage,
// so each says who it is with ?as=<user id>. Only honoured inside a frame on the /demo page.
// The mock backend lives in the browser anyway; a real backend must ignore this.
export const DEMO_FRAME_USER = (() => {
  try {
    if (window.parent === window || window.parent.location.pathname !== '/demo') return ''
    return new URLSearchParams(window.location.search).get('as') ?? ''
  } catch {
    return ''
  }
})()

// The deck posts this when a frame should show the latest data, so it can show one role's screen changing before the other's
export const DEMO_REFRESH = 'careride-refresh'
