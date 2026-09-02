import { headers } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { DashboardNavbar } from '@/components/layout/DashboardNavbar'
import { Footer } from '@/components/layout/Footer'
import { BottomNav } from '@/components/layout/BottomNav'
import { DashboardBottomNav } from '@/components/layout/DashboardBottomNav'
import { ShopClosedBanner } from '@/components/layout/ShopClosedBanner'
import { USER_ID_HEADER } from '@/lib/supabase/middleware'
import { getShopStatus } from '@/lib/data'

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  // Signed-in visitors get the dashboard chrome everywhere in this group, so
  // pages reachable from the dashboard (Menu -> /products, checkout, order
  // confirmation) never fall back to the public landing navbar.
  //
  // The proxy has already verified the JWT this request, so read its result
  // instead of paying another ~300ms round-trip to the Auth server here.
  const isSignedIn = !!(await headers()).get(USER_ID_HEADER)
  const shopStatus = await getShopStatus()

  return (
    <div className="flex min-h-screen flex-col">
      {!shopStatus.is_open && <ShopClosedBanner message={shopStatus.closed_message} />}
      {isSignedIn ? <DashboardNavbar /> : <Navbar />}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      {isSignedIn ? <DashboardBottomNav /> : <BottomNav />}
    </div>
  )
}
