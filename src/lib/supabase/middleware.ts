import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Header the app reads to know who is signed in. Set here and nowhere else. */
export const USER_ID_HEADER = 'x-user-id'

export async function updateSession(request: NextRequest) {
  // Supabase isn't configured yet (no .env.local) — let requests through
  // rather than crashing every page with a missing-env-var error.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  // Buffer refreshed session cookies so the response can be built once, after
  // the auth check — otherwise the injected header would be snapshotted early.
  const refreshedCookies: { name: string; value: string; options?: object }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          refreshedCookies.push(...cookiesToSet)
        },
      },
    }
  )

  // getClaims() verifies the JWT signature locally against the project's cached
  // JWKS (~2ms) instead of a ~300ms round-trip to the Auth server per request.
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub ?? null

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!userId) return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect user account routes
  const protectedPaths = ['/dashboard', '/cart', '/checkout', '/orders', '/account']
  if (protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p))) {
    if (!userId) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  const requestHeaders = new Headers(request.headers)
  // Drop any client-supplied value before setting our own — this header is
  // trusted downstream, so it must only ever originate here.
  requestHeaders.delete(USER_ID_HEADER)
  if (userId) requestHeaders.set(USER_ID_HEADER, userId)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  refreshedCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  )
  return response
}
