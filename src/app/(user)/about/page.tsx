import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { getActiveCities } from '@/lib/data'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'The story behind Patel Farsan — a Gujarati family tradition since 1985.',
}

const VALUE_CARDS = [
  {
    emoji: '🌅',
    title: 'Made Fresh Daily',
    body: 'Every batch is made fresh each morning. We never store yesterday’s farsan.',
  },
  {
    emoji: '🫙',
    title: 'Traditional Recipes',
    body: 'Our recipes are 40+ years old. Passed from generation to generation. Never changed.',
  },
  {
    emoji: '🚚',
    title: 'Delivered to You',
    body: 'What took a trip to the shop now comes to your home. Same freshness, same love.',
  },
]

const VALUES = [
  'No artificial colors or preservatives',
  'Prepared in a hygienic, certified kitchen',
  'Ingredients sourced fresh every morning',
]

export default async function AboutPage() {
  const cities = await getActiveCities()

  const numbers = [
    { value: '1985', label: 'Since' },
    { value: '40+', label: 'Recipes' },
    // Reflects the cities actually configured in the admin panel, rather
    // than a number that goes stale the moment delivery areas change.
    { value: String(cities.length), label: cities.length === 1 ? 'City' : 'Cities' },
    { value: 'Daily', label: 'Fresh' },
  ]

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="px-4 py-14 text-center md:py-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-serif text-3xl font-bold text-maroon md:text-5xl">
            Since 1985, Made with Love.
          </h1>
          <p className="mt-3 text-sm text-stone-500 md:text-base">
            A Gujarati family tradition, now at your doorstep.
          </p>
          <OrnamentalDivider />
        </div>
      </section>

      {/* Our story */}
      <section className="mx-auto max-w-4xl px-4 pb-14 md:pb-20">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div className="mx-auto flex flex-col items-center">
            <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon to-maroon-light shadow-lg md:h-[400px] md:w-[400px]">
              {/* Cream seal keeps the logo on the background it was drawn
                  for — see the matching section on the landing page for why
                  the cut-out artwork can't sit directly on maroon. */}
              <div className="flex h-[80%] w-[80%] items-center justify-center rounded-full bg-cream p-5 shadow-inner ring-1 ring-gold/40">
                <Image
                  src="/images/logo-mark.png"
                  alt="Patel Farsan"
                  width={1254}
                  height={1254}
                  sizes="(min-width: 768px) 22rem, 60vw"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <p className="mt-3 font-serif text-sm font-semibold text-gold">Est. 1985</p>
          </div>

          <div>
            <p className="font-serif text-sm italic text-gold">આ છે આપણી વાર્તા</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-maroon md:text-3xl">
              Our Story
            </h2>
            <OrnamentalDivider size="sm" className="!ml-0 !justify-start" />

            <p className="text-[15px] leading-relaxed text-stone-600">
              Patel Farsan was founded in 1985 by our family in the heart of Gujarat. What
              started as a small shop with just a few recipes passed down through generations
              has grown into a beloved local institution.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
              Every morning, our kitchen comes alive before sunrise. Our artisans use the same
              traditional recipes — pure besan, fresh spices, cold-pressed oil — that our
              founder used four decades ago. No shortcuts. No compromises.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
              Today, we bring that same freshness and love to your doorstep. From our family to
              yours — સ્વાદ ગુજરાતીનો, સંસ્કાર આપણી પરંપરાનો.
            </p>
          </div>
        </div>
      </section>

      {/* Why we're different */}
      <section className="bg-white px-4 py-14 md:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="section-title text-2xl md:text-3xl">What Makes Us Different</h2>
          <OrnamentalDivider />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {VALUE_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border-t-4 border-t-gold bg-white p-6 text-center shadow-[0_4px_16px_rgba(92,26,21,0.06)]"
              >
                <span className="text-4xl">{card.emoji}</span>
                <h3 className="mt-3 font-serif text-lg font-bold text-maroon">{card.title}</h3>
                <p className="mt-1.5 text-sm text-stone-500">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers strip */}
      <section className="bg-maroon-dark py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 text-center md:grid-cols-4">
          {numbers.map((n) => (
            <div key={n.label}>
              <p className="font-serif text-3xl font-bold text-gold md:text-4xl">{n.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-cream/70">{n.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our values */}
      <section className="px-4 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title text-2xl md:text-3xl">Our Promise</h2>
          <OrnamentalDivider />
          <div className="space-y-4 text-left">
            {VALUES.map((v) => (
              <div key={v} className="flex items-start gap-3">
                <span className="mt-0.5 text-gold">✓</span>
                <p className="text-sm font-medium text-maroon md:text-base">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16 text-center">
        <h2 className="section-title text-xl md:text-2xl">Ready to taste the difference?</h2>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/products" className="btn-primary">
            Order Now →
          </Link>
          <Link href="/products" className="btn-outline">
            Browse Menu
          </Link>
        </div>
      </section>
    </div>
  )
}
