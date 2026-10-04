// Removes a CareRide account (guide Step 14).
//
// 1. Calls admin_deactivate_account() AS THE CALLER, so the database checks they are an active platform
//    admin and does the safe part (switch off, protect the last admin, move the driver's rides) in one
//    transaction. Being signed in is not enough.
// 2. Only then uses the server-only secret key to delete the Supabase login.
// If step 2 fails, the account stays switched off and deleting it again finishes the job.
//
// Deploy: npx supabase functions deploy admin-delete-account --use-api
// The secret key is provided to Edge Functions by Supabase; it never reaches the browser.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// Supabase provides keys under the legacy names, the newer JSON lists, or both, depending on the project.
function key(legacyName: string, listName: string): string | undefined {
  const legacy = Deno.env.get(legacyName)
  if (legacy) return legacy
  try {
    const keys = JSON.parse(Deno.env.get(listName) ?? '{}') as Record<string, string>
    return keys.default ?? Object.values(keys)[0]
  } catch {
    return undefined
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'Please sign in.' }, 401)

  const { profileId } = (await req.json().catch(() => ({}))) as { profileId?: unknown }
  if (typeof profileId !== 'string' || !profileId) return json({ error: 'Choose an account to delete.' }, 400)

  const url = Deno.env.get('SUPABASE_URL')
  const publishableKey = key('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS')
  const secretKey = key('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS')
  if (!url || !publishableKey || !secretKey) return json({ error: 'The server is missing its Supabase settings.' }, 500)

  // As the caller: the database decides whether they may do this.
  const asCaller = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authUserId, error } = await asCaller.rpc('admin_deactivate_account', { p_profile_id: profileId })
  if (error) {
    const ours = error.code === 'P0001' // messages written for people
    return json({ error: ours ? error.message : "We couldn't remove this account. Please try again." }, ours ? 400 : 500)
  }

  if (authUserId) {
    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: deleteError } = await admin.auth.admin.deleteUser(authUserId as string)
    if (deleteError && deleteError.status !== 404) {
      console.error('deleteUser failed', deleteError)
      return json({ error: 'The account was switched off, but removing its login failed. Delete it again to finish.' }, 502)
    }
  }

  return json({ ok: true })
})
