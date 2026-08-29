import Link from 'next/link'
import { Phone, MessageCircle, MapPin, Clock } from 'lucide-react'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { SHOP_PHONE, SHOP_WHATSAPP } from '@/lib/constants'

const QUICK_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Menu' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
]

export function Footer() {
  return (
    <footer className="bg-maroon-dark text-cream">
      <div className="mx-auto max-w-7xl px-6 pt-12">
        <OrnamentalDivider className="opacity-80" />

        <div className="grid grid-cols-1 gap-10 py-8 md:grid-cols-3">
          {/* Col 1 — brand */}
          <div>
            <h3 className="font-serif text-2xl font-bold text-gold">પટેલ ફરસાણ</h3>
            <p className="mt-1 text-sm text-cream/80">Patel Farsan</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
              Authentic Gujarati farsan, handcrafted daily since 1985. A family
              tradition, now delivered to your doorstep.
            </p>
          </div>

          {/* Col 2 — links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream/70 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold">
              Visit / Contact
            </h4>
            <ul className="space-y-3 text-sm text-cream/70">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                Patel Farsan, Mota Gunda, Bhanvad, Dwarka — 360510
              </li>
              {SHOP_PHONE && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-gold" />
                  <a href={`tel:${SHOP_PHONE}`} className="hover:text-gold">
                    {SHOP_PHONE}
                  </a>
                </li>
              )}
              {SHOP_WHATSAPP && (
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0 text-gold" />
                  <a
                    href={`https://wa.me/${SHOP_WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gold"
                  >
                    Chat on WhatsApp
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-gold" />
                8:00 AM – 9:00 PM, all days
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/10 py-5 text-center text-xs text-gold/60">
          © {new Date().getFullYear()} Patel Farsan. Since 1985. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
