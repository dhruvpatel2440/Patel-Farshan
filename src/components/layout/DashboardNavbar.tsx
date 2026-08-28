'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore, selectCartCount } from '@/store/cartStore'
import { createClient } from '@/lib/supabase/client'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export const DASHBOARD_NAV_LINKS = [
  { href: '/products', label: 'Menu' },
  { href: '/cart', label: 'My Cart' },
  { href: '/orders', label: 'My Orders' },
  { href: '/track', label: 'Track My Order' },
  { href: '/account', label: 'My Account' },
]

export function DashboardNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile } = useAuth()
  const cartCount = useCartStore(selectCartCount)
  const [hydrated, setHydrated] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setHydrated(true), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = (profile?.name || user?.email || 'U').slice(0, 1).toUpperCase()

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-maroon transition-shadow duration-200',
        scrolled && 'shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 md:px-6">
        {/* Mobile: hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet>
            <SheetTrigger
              aria-label="Open menu"
              className="-ml-2 p-2 text-cream transition-colors hover:text-gold"
            >
              <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-cream">
              <SheetHeader>
                <SheetTitle className="font-serif text-maroon">My Dashboard</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href="/dashboard"
                      className={cn(
                        'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        pathname === '/dashboard'
                          ? 'bg-maroon/10 font-semibold text-maroon'
                          : 'text-stone-700 hover:bg-maroon/5'
                      )}
                    >
                      Dashboard
                    </Link>
                  }
                />
                {DASHBOARD_NAV_LINKS.map((link) => (
                  <SheetClose
                    nativeButton={false}
                    key={link.href}
                    render={
                      <Link
                        href={link.href}
                        className={cn(
                          'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          pathname === link.href
                            ? 'bg-maroon/10 font-semibold text-maroon'
                            : 'text-stone-700 hover:bg-maroon/5'
                        )}
                      >
                        {link.label}
                      </Link>
                    }
                  />
                ))}
                <div className="my-2 h-px bg-cream-dark" />
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href="/"
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-maroon/5"
                    >
                      Back to Shop
                    </Link>
                  }
                />
                {user && (
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <Link href="/dashboard" className="flex flex-col items-center leading-none md:items-start">
          <span className="font-serif text-xl font-bold text-cream md:text-2xl">પટેલ ફરસાણ</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-gold md:text-xs">
            My Dashboard
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-7 md:flex">
          {DASHBOARD_NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative pb-1 text-sm font-medium transition-colors',
                  active ? 'text-gold' : 'text-cream/90 hover:text-gold'
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-gold" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right: cart + avatar */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/cart" className="relative p-1.5 text-cream transition-colors hover:text-gold">
            <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
            {hydrated && cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden border-none bg-transparent p-0 md:flex">
                <Avatar className="h-8 w-8 border-2 border-gold">
                  <AvatarFallback className="bg-gold text-xs font-bold text-maroon">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem render={<Link href="/dashboard">Dashboard</Link>} />
                <DropdownMenuItem render={<Link href="/">Back to Shop</Link>} />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
