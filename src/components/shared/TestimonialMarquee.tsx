import { StarRatingDisplay } from '@/components/shared/StarRatingDisplay'
import { GoogleBadge } from '@/components/shared/GoogleBadge'
import type { Testimonial } from '@/types'

function TestimonialCard({ item }: { item: Testimonial }) {
  const initial = item.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border-2 border-maroon/15 bg-white p-5 shadow-sm sm:w-80">
      <div className="flex items-center gap-3">
        {item.photoUrl ? (
          // Google-hosted avatar with an unpredictable CDN host; not worth a
          // next.config.ts remotePatterns entry for a handful of small icons.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-base font-bold text-maroon">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-serif font-bold text-maroon">{item.name}</p>
            {item.source === 'google' && <GoogleBadge className="h-3.5 w-3.5 shrink-0" />}
          </div>
          <StarRatingDisplay rating={item.rating} />
        </div>
      </div>
      {item.message && (
        <p className="line-clamp-4 text-sm leading-relaxed text-stone-600">
          &ldquo;{item.message}&rdquo;
        </p>
      )}
    </div>
  )
}

export function TestimonialMarquee({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null

  // Duplicated so the track can loop seamlessly — see the marquee-ltr
  // keyframes in globals.css for how the -50% → 0% animation uses this.
  const track = [...items, ...items]

  return (
    <section className="overflow-hidden bg-cream py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="section-title text-center text-2xl md:text-3xl">What Our Customers Say</h2>
        <p className="mt-1 text-center text-sm text-stone-500">Real feedback from real orders</p>
      </div>

      <div
        className="pause-on-hover relative mt-8 overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
        }}
      >
        {/* The track repeats the same reviews for the seamless loop, which
            would read to assistive tech as saying each one twice — the
            whole animated strip is marked decorative/duplicate instead. */}
        <div className="animate-marquee-ltr flex w-max gap-5" aria-hidden="true">
          {track.map((item, i) => (
            <TestimonialCard key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
