'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, FolderTree, ClipboardList, Building2, Users, MessageSquareHeart, Store, LogOut, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
  { href: '/admin/cities', label: 'Cities', icon: Building2 },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    // Server-side so the httpOnly admin elevation cookie is cleared too —
    // signing out client-side alone would leave it valid for 8 hours.
    await fetch('/api/admin-auth/logout', { method: 'POST' })
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin-login')
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col bg-maroon-dark px-3 py-5 text-cream">
      <div className="px-2">
        <p className="font-serif text-lg font-bold leading-tight text-gold">Patel Farsan</p>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cream/50">Admin</p>
        <OrnamentalDivider size="sm" className="!my-2" />
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 rounded-md border-l-[3px] px-3 py-2.5 text-sm font-medium text-gold transition-colors',
                active ? 'border-l-gold bg-gold/10' : 'border-l-transparent hover:bg-gold/5'
              )}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </Link>
          )
        })}

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2.5 rounded-md border-l-[3px] border-l-transparent px-3 py-2.5 text-sm font-medium text-gold hover:bg-gold/5"
        >
          <Store className="h-4 w-4" /> View Shop
        </a>
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 rounded-md border-l-[3px] border-l-transparent px-3 py-2.5 text-sm font-medium text-gold hover:bg-gold/5"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  )
}

export function AdminSidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 bg-maroon px-4 py-3 md:hidden">
        <Sheet>
          <SheetTrigger className="text-cream">
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 bg-maroon-dark p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Admin Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <p className="font-serif text-sm font-bold text-gold">Patel Farsan Admin</p>
      </div>
    </>
  )
}
