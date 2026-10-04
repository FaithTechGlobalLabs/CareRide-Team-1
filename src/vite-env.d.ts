/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Git commit baked at `vite build`. Cloudflare Workers Builds sets this from WORKERS_CI_COMMIT_SHA. */
  readonly VITE_COMMIT_SHA?: string
  /** Which backend the app talks to. Defaults to 'mock' when unset. */
  readonly VITE_DATA_BACKEND?: 'mock' | 'supabase'
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** The website email links open (confirm, reset password). Needed for the Android app; the website uses its own address. */
  readonly VITE_PUBLIC_SITE_URL?: string
  /** Optional. Turns on drive times and route maps for drivers. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  /** Optional. Defaults to Google's DEMO_MAP_ID. */
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
