import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { ProductCard } from '@/components/product/ProductCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { getActiveCities, getCategories, getFeaturedProducts } from '@/lib/data'

export const dynamic = 'force-dynamic'

const CATEGORY_EMOJI: Record<string, string> = {
  Farsan: '🥨',
  Namkeen: '🥜',
  Sweets: '🍬',
  'Fried Snacks': '🍤',
  'Combo Packs': '🎁',
  Seasonal: '🌾',
}

const STEPS = [
  { emoji: '🛍', title: 'Browse Menu', desc: 'Explore fresh farsan & sweets' },
  { emoji: '🛒', title: 'Add to Cart', desc: 'Pick your favourites' },
  { emoji: '💳', title: 'Pay or COD', desc: 'UPI QR or cash on delivery' },
  { emoji: '🚚', title: 'Get Delivered', desc: 'Fresh to your doorstep' },
]

export default async function LandingPage() {
  const [categories, featured, cities] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
    getActiveCities(),
  ])

  return (
    <>
      {/* ---------------------------------------------------------- */}
      {/* HERO                                                       */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-cream py-14 md:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, var(--color-cream-dark) 0%, var(--color-cream) 70%)',
            opacity: 0.6,
          }}
          aria-hidden="true"
        />
        {/* corner ornaments */}
        <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 border-l-4 border-t-4 border-maroon/20 md:h-32 md:w-32" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 border-b-4 border-r-4 border-maroon/20 md:h-32 md:w-32" aria-hidden="true" />

        <div className="relative mx-auto flex max-w-7xl flex-col-reverse items-center gap-10 px-6 md:flex-row md:gap-8">
          {/* left column */}
          <div className="flex-1 text-center md:text-left animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-bold text-maroon">
              🏪 Authentic Gujarati Since 1985
            </span>

            <h1 className="mt-4 font-serif font-bold text-maroon">
              <span className="block text-3xl leading-tight md:text-5xl">
                સ્વાદ ગુજરાતીનો,
              </span>
              <span className="block text-2xl italic leading-tight text-maroon/70 md:text-4xl">
                Taste of Gujarat.
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-sm text-sm text-stone-600 md:mx-0 md:text-base">
              Fresh farsan, handcrafted daily since 1985. Now delivered to your
              doorstep.
            </p>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row md:justify-start justify-center">
              <Link href="/products" className="btn-primary inline-flex items-center gap-1.5 hover:scale-[1.02]">
                Order Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/products" className="btn-outline hover:scale-[1.02]">
                Browse Menu
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {['Made Fresh Daily', 'Same-day Delivery', 'Since 1985'].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-maroon bg-white px-2.5 py-1 text-[11px] font-semibold text-maroon"
                >
                  ✓ {badge}
                </span>
              ))}
            </div>
          </div>

          {/* right column */}
          <div className="flex flex-1 justify-center animate-fade-up">
            {/* Scales fluidly with the viewport instead of jumping at
                breakpoints, so it looks right on small phones through
                large desktops without a fixed pixel size. */}
            <Image
              src="/images/logo-mark.png"
              alt="Patel Farsan — authentic Gujarati farsan since 1985"
              width={1254}
              height={1254}
              priority
              sizes="(min-width: 768px) min(38vw, 26rem), min(72vw, 18rem)"
              className="h-auto w-[min(72vw,18rem)] object-contain md:w-[min(38vw,26rem)]"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* CATEGORIES                                                 */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-cream py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="section-title text-center text-2xl md:text-3xl">Shop by Category</h2>
          <OrnamentalDivider />

          {categories.length === 0 ? (
            <EmptyState emoji="🗂️" heading="Categories coming soon" />
          ) : (
            /* Wraps and stays centred for any number of categories, so the
               row never sits lopsided when some are removed, and never
               needs a hidden sideways scroll on small screens. */
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-7 sm:gap-x-8 md:gap-x-10">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="group flex w-[4.5rem] flex-col items-center gap-2 text-center sm:w-24 lg:w-28"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-maroon text-2xl text-cream ring-0 ring-gold transition-all duration-200 group-hover:scale-105 group-hover:ring-4 lg:h-20 lg:w-20 lg:text-3xl">
                    {CATEGORY_EMOJI[cat.name] ?? '🍛'}
                  </span>
                  <span className="font-gujarati text-xs font-semibold leading-tight text-maroon">
                    {cat.name_gujarati}
                  </span>
                  <span className="text-[10px] leading-tight text-stone-500">{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* BESTSELLERS                                                */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="font-gujarati section-title text-2xl md:text-3xl">
              આ અઠવાડિયાના ફેવરિટ
            </h2>
            <p className="mt-1 text-sm text-stone-500">This Week&apos;s Favourites</p>
            <OrnamentalDivider size="sm" />
          </div>

          {featured.length === 0 ? (
            <EmptyState
              emoji="🍛"
              heading="Menu coming soon"
              subtext="We're preparing something delicious — check back shortly."
              ctaLabel="Browse Full Menu"
              ctaHref="/products"
            />
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-6 text-right">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-dark"
                >
                  View Full Menu <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* DELIVERY CITIES                                            */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-maroon-dark py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">We Deliver To</p>
          {cities.length === 0 ? (
            <p className="mt-4 text-sm text-cream/50">Delivery cities coming soon.</p>
          ) : (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {cities.map((city) => (
                <span
                  key={city.id}
                  className="rounded-full border border-gold px-4 py-1.5 text-sm font-medium text-gold"
                >
                  {city.name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-cream/40">
            Don&apos;t see your city? We&apos;re expanding soon.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* HOW IT WORKS                                               */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-cream py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="section-title text-center text-2xl md:text-3xl">How It Works</h2>
          <OrnamentalDivider />

          <div className="relative grid grid-cols-2 gap-8 md:grid-cols-4">
            <div
              className="pointer-events-none absolute left-0 right-0 top-6 hidden border-t-2 border-dashed border-gold/50 md:block"
              aria-hidden="true"
            />
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-maroon text-lg font-bold text-cream">
                  {i + 1}
                </span>
                <span className="mt-3 text-3xl">{step.emoji}</span>
                <p className="mt-2 font-serif text-sm font-bold text-maroon">{step.title}</p>
                <p className="mt-1 text-xs text-stone-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* OUR STORY                                                  */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
          <div className="mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-2xl bg-gradient-to-br from-maroon to-maroon-light shadow-lg">
            {/* Cream seal keeps the logo on the background it was drawn for —
                its cut-out edge blends into cream, not into the maroon. */}
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
          <div>
            <p className="font-serif text-sm font-semibold uppercase tracking-widest text-gold">
              Since 1985
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-maroon md:text-3xl">
              Made with love, served with pride.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-600 md:text-base">
              For four decades, Patel Farsan has stayed true to one promise: fresh,
              handcrafted farsan made the way our grandparents taught us. Every batch
              of ganthiya, jalebi and chakli is made fresh each morning, using the same
              recipes and the same care since the day we opened our doors.
            </p>
            <p className="mt-4 font-serif italic text-gold">
              &ldquo;દરેક ઘડીને ખાસ બનાવો&rdquo;
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
