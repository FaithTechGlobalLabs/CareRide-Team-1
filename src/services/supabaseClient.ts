import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Created on first use so mock mode never needs Supabase settings.
let client: SupabaseClient | undefined

export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      'CareRide Supabase connection settings are missing. Set VITE_SUPABASE_URL and ' +
        'VITE_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the dev server.',
    )
  }

  // Default auth storage: one session shared across tabs in this browser.
  client = createClient(url, publishableKey)
  return client
}
