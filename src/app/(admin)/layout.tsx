import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { hasAdminElevation } from '@/lib/adminSession'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let allowed = false

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Both are required: the account must be an admin AND the visitor must
      // have passed the emailed code at /admin-login within the last 8 hours.
      // A plain customer session — even an admin's own storefront session —
      // cannot reach this area.
      allowed = profile?.role === 'admin' && (await hasAdminElevation(user.id))
    }
  } catch {
    allowed = false
  }

  if (!allowed) redirect('/admin-login')

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F8F8]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  )
}
