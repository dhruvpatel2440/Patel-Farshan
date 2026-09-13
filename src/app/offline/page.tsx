import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'No internet',
}

/**
 * Cached by the service worker at install time and shown when a page load
 * fails. It must stay fully static — no data fetching — because by the time
 * anyone sees it there is no network to fetch with.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <Image
        src="/images/logo-mark.png"
        alt="Patel Farsan"
        width={1254}
        height={1254}
        className="h-auto w-40 object-contain"
      />

      <h1 className="mt-6 font-gujarati text-2xl font-bold text-maroon">
        ઇન્ટરનેટ કનેક્શન નથી
      </h1>
      <p className="mt-1 font-serif text-lg text-maroon/70">No internet connection</p>

      <p className="mt-4 max-w-xs text-sm text-stone-600">
        Please check your mobile data or Wi-Fi, then try again. Your cart is saved on this
        phone — nothing is lost.
      </p>

      {/* Deliberately a plain anchor, not next/link: this button exists to
          retry the network, and a client-side navigation would just fail
          against the same dead connection without ever hitting the server. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="btn-primary mt-6">
        Try Again
      </a>

      <p className="mt-6 text-xs text-stone-400">
        To order by phone, call the shop directly.
      </p>
    </div>
  )
}
