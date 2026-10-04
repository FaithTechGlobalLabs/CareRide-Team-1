/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Which backend the app talks to. Defaults to 'mock' when unset. */
  readonly VITE_DATA_BACKEND?: 'mock' | 'supabase'
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
