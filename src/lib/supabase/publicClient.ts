import { createClient } from '@supabase/supabase-js'

/**
 * Anon, cookie-free Supabase client for public catalog reads (categories,
 * products, cities).
 *
 * The cookie-bound server client can't be used inside `unstable_cache` —
 * touching cookies opts a request out of caching entirely. This data is
 * identical for every visitor and already gated by the "anyone can view
 * active/available ..." RLS policies, so no session is needed to read it.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
