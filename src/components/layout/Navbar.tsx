'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ShoppingCart, User as UserIcon } from 'lucide-react'
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

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Menu' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function Navbar() {
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
              className="p-2 -ml-2 text-cream hover:text-gold transition-colors"
            >
              <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="left" className="bg-cream w-72">
              <SheetHeader>
                <SheetTitle className="font-serif text-maroon">Patel Farsan</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <SheetClose
                    nativeButton={false}
                    key={link.href}
                    render={
                      <Link
                        href={link.href}
                        className={cn(
                          'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          pathname === link.href
                            ? 'bg-maroon/10 text-maroon font-semibold'
                            : 'text-stone-700 hover:bg-maroon/5'
                        )}
                      >
                        {link.label}
                      </Link>
                    }
                  />
                ))}
                <div className="my-2 h-px bg-cream-dark" />
                {user ? (
                  <>
                    <SheetClose
                      nativeButton={false}
                      render={
                        <Link href="/dashboard" className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-maroon/5">
                          Dashboard
                        </Link>
                      }
                    />
                    <SheetClose
                      nativeButton={false}
                      render={
                        <Link href="/account" className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-maroon/5">
                          My Account
                        </Link>
                      }
                    />
                    <button
                      onClick={handleLogout}
                      className="text-left rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link href="/login" className="rounded-lg bg-gold px-3 py-2.5 text-center text-sm font-bold text-maroon">
                        Login
                      </Link>
                    }
                  />
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <Link href="/" className="flex flex-col items-center md:items-start leading-none">
          <span className="font-serif text-xl md:text-2xl font-bold text-cream">
            પટેલ ફરસાણ
          </span>
          <span className="text-[10px] md:text-xs tracking-widest text-gold font-medium uppercase">
            Patel Farsan
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative text-sm font-medium transition-colors pb-1',
                  active ? 'text-gold' : 'text-cream/90 hover:text-gold'
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gold rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right: cart + auth */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/cart" className="relative p-1.5 text-cream hover:text-gold transition-colors">
            <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
            {hydrated && cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex bg-transparent border-none p-0">
                <Avatar className="h-8 w-8 border-2 border-gold">
                  <AvatarFallback className="bg-gold text-maroon text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem render={<Link href="/dashboard">Dashboard</Link>} />
                <DropdownMenuItem render={<Link href="/orders">My Orders</Link>} />
                <DropdownMenuItem render={<Link href="/account">My Account</Link>} />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-gold px-3 text-xs font-bold text-maroon hover:bg-gold-light transition-colors md:min-h-0 md:gap-1.5 md:px-4 md:py-2 md:text-sm"
            >
              <UserIcon className="h-4 w-4" />
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
