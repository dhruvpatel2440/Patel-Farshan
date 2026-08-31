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

const csp = [
  "default-src 'self'",
  "script-src 'self'",
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
          // Report-only for now: check the browser console for violations,
          // then switch this key to 'Content-Security-Policy' to enforce.
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
