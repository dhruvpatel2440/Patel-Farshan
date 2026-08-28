'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UtensilsCrossed, ShoppingCart, Package, Search, User } from 'lucide-react'
import { useCartStore, selectCartCount } from '@/store/cartStore'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/products', label: 'Menu', icon: UtensilsCrossed },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/track', label: 'Track', icon: Search },
  { href: '/account', label: 'Account', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const cartCount = useCartStore(selectCartCount)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => setHydrated(true), [])

  if (pathname === '/') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around border-t border-gold/30 bg-white md:hidden pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2"
          >
            {active && (
              <span className="absolute top-0.5 h-1 w-1 rounded-full bg-gold" />
            )}
            <span className="relative">
              <Icon
                className={cn(
                  'h-5 w-5',
                  active ? 'text-maroon' : 'text-stone-400'
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              {tab.href === '/cart' && hydrated && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </span>
            <span
              className={cn(
                'text-[10px] font-medium',
                active ? 'text-maroon font-semibold' : 'text-stone-400'
              )}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
