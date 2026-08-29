import { Quote } from 'lucide-react'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { StarRatingDisplay } from '@/components/shared/StarRatingDisplay'
import type { Feedback } from '@/types'

// Below this many reviews, an infinite scroll just loops the same one or two
// cards past a mostly-empty track — it reads as broken, not lively. A
// centered static row carries a couple of reviews far better; the marquee is
// worth it once there's enough content to actually feel like it's flowing.
const MIN_ITEMS_TO_SCROLL = 5

function TestimonialCard({ item }: { item: Feedback }) {
  const initial = item.user_name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="relative flex w-72 shrink-0 flex-col gap-3 overflow-hidden rounded-2xl border-2 border-gold/30 bg-white p-6 shadow-md sm:w-80">
      <Quote
        className="absolute -right-2 -top-2 h-16 w-16 rotate-12 text-gold/10"
        strokeWidth={1}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-lg font-bold text-maroon shadow-sm">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif font-bold text-maroon">{item.user_name}</p>
          <StarRatingDisplay rating={item.rating} />
        </div>
      </div>
      {item.message && (
        <p className="relative line-clamp-4 text-sm leading-relaxed text-stone-600">
          &ldquo;{item.message}&rdquo;
        </p>
      )}
    </div>
  )
}

function SectionHeading() {
  return (
    <div className="mx-auto max-w-7xl px-6 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-bold text-maroon">
        💬 Customer Love
      </span>
      <h2 className="mt-3 font-serif text-2xl font-bold text-maroon md:text-3xl">
        What Our Customers Say
      </h2>
      <p className="mt-1 text-sm text-stone-500">Real feedback from real orders</p>
      <OrnamentalDivider size="sm" />
    </div>
  )
}

export function TestimonialMarquee({ items }: { items: Feedback[] }) {
  if (items.length === 0) return null

  if (items.length < MIN_ITEMS_TO_SCROLL) {
    return (
      <section className="bg-cream py-12 md:py-16">
        <SectionHeading />
        <div className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-5 px-6">
          {items.map((item) => (
            <TestimonialCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    )
  }

  // Duplicated so the track can loop seamlessly — see the marquee-ltr
  // keyframes in globals.css for how the -50% → 0% animation uses this.
  const track = [...items, ...items]

  return (
    <section className="overflow-hidden bg-cream py-12 md:py-16">
      <SectionHeading />

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
