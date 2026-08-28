import { DashboardNavbar } from '@/components/layout/DashboardNavbar'
import { DashboardBottomNav } from '@/components/layout/DashboardBottomNav'
import { Footer } from '@/components/layout/Footer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <DashboardBottomNav />
    </div>
  )
}
