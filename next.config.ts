import type { NextConfig } from 'next'
import path from 'path'

/**
 * Supabase is the only cross-origin the app talks to: the REST/auth/realtime
 * API (connect-src) and public storage for product images (img-src). The
 * project URL is baked in at build time from NEXT_PUBLIC_SUPABASE_URL; the
 * wildcard covers storage on any Supabase host.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseWs = supabaseUrl.replace(/^https:/, 'wss:')

const isDev = process.env.NODE_ENV !== 'production'

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next itself: the streamed RSC payload is
  // delivered as inline self.__next_f.push(...) scripts whose hashes change
  // on every page and every build, so hashes can't be pinned. Removing it
  // means nonces from middleware, which forces every page to render
  // dynamically. The tradeoff is accepted: this directive still blocks
  // remote script hosts and eval, and XSS defence rests on React escaping.
  // React's development build uses eval() for debugging features
  // (reconstructing callstacks); it never does in production, so the
  // allowance is scoped to `next dev` and never reaches the deployed site.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Tailwind and the UI libraries emit inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.supabase.co ${supabaseUrl}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .join('; ')
  .replace(/\s+/g, ' ')
  .trim()

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Enforcing. Verified report-only against the deployed site first:
          // the only violations were the inline scripts allowed above.
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
