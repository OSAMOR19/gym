import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Fail fast with a clear message — without this, a missing .env surfaced
    // as an opaque "supabaseUrl is required" crash deep inside middleware
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.'
    )
  }
  return createBrowserClient(url, key)
}
