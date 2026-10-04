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

// True on the /demo deck and in its frames. The deck resets and rewrites its data on every run,
// so it always plays on the browser-only mock and never touches a real database.
export const ON_DEMO_DECK = (() => {
  try {
    return window.location.pathname === '/demo' || (window.parent !== window && window.parent.location.pathname === '/demo')
  } catch {
    return false
  }
})()

// The deck posts this when a frame should show the latest data, so it can show one role's screen changing before the other's
export const DEMO_REFRESH = 'careride-refresh'
