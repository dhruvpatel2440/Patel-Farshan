import Link from 'next/link'
import { ClipboardList, IndianRupee, PackageX, AlertTriangle, Plus, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/shared/StatusBadge'

export const dynamic = 'force-dynamic'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('name').eq('id', user.id).single()
    : { data: null }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [{ data: todayOrders }, { data: pendingVerify }, { data: lowStock }, { data: recentOrdersRaw }] =
    await Promise.all([
      supabase.from('orders').select('total').gte('placed_at', startOfDay.toISOString()),
      supabase.from('orders').select('id', { count: 'exact' }).eq('payment_status', 'awaiting_verification'),
      supabase.from('products').select('id').lt('stock_qty', 10).eq('is_deleted', false),
      supabase.from('orders').select('*').order('placed_at', { ascending: false }).limit(10),
    ])

  const userIds = [...new Set((recentOrdersRaw ?? []).map((o) => o.user_id))]
  const { data: profilesData } = userIds.length
    ? await supabase.from('profiles').select('id, name, phone').in('id', userIds)
    : { data: [] }
  const profileById = new Map((profilesData ?? []).map((p) => [p.id, p]))
  const recentOrders = (recentOrdersRaw ?? []).map((o) => ({ ...o, profile: profileById.get(o.user_id) ?? null }))

  const todayCount = todayOrders?.length ?? 0
  const todayRevenue = (todayOrders ?? []).reduce((sum, o) => sum + Number(o.total), 0)
  const pendingCount = pendingVerify?.length ?? 0
  const lowStockCount = lowStock?.length ?? 0

  const stats = [
    { label: "Today's Orders", value: todayCount, icon: ClipboardList },
    { label: "Today's Revenue", value: `₹${todayRevenue.toFixed(0)}`, icon: IndianRupee },
    { label: 'Pending Verify', value: pendingCount, icon: AlertTriangle },
    { label: 'Low Stock Items', value: lowStockCount, icon: PackageX },
  ]

  return (
    <div className="p-4 md:p-8">
      <p className="text-sm text-stone-500">
        {getGreeting()}, {profile?.name || 'Admin'}
      </p>
      <h1 className="font-serif text-2xl font-bold text-maroon">Patel Farsan Admin</h1>

      {(pendingCount > 0 || lowStockCount > 0) && (
        <div className="mt-4 space-y-2">
          {pendingCount > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <span>🔴 {pendingCount} UPI payment(s) awaiting verification</span>
              <Link href="/admin/orders" className="font-semibold underline">
                Review
              </Link>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <span>🟡 {lowStockCount} item(s) with low stock</span>
              <Link href="/admin/products" className="font-semibold underline">
                View
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-stone-200 border-t-[3px] border-t-maroon bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-maroon text-cream">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-serif text-2xl font-bold text-maroon">{stat.value}</p>
              <p className="text-xs text-stone-500">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="mb-3 font-serif text-lg font-bold text-maroon">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
                <th className="py-2 pr-3">Order #</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders ?? []).map((order) => (
                <tr key={order.id} className="border-b border-stone-100 last:border-0">
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-mono font-bold text-maroon">
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <p>{order.profile?.name}</p>
                    <p className="text-xs text-stone-400">{order.profile?.phone}</p>
                  </td>
                  <td className="py-2.5 pr-3">₹{order.total}</td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium">
                      {order.payment_mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={order.order_status} />
                  </td>
                </tr>
              ))}
              {(!recentOrders || recentOrders.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-400">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          {(recentOrders ?? []).length > 0 &&
            format(new Date(recentOrders![0].placed_at), "'Last updated' d MMM, h:mm a")}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/admin/products" className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-maroon/40 bg-white p-5 text-sm font-semibold text-maroon hover:bg-maroon/5">
          <Plus className="h-4 w-4" /> Add Product
        </Link>
        <Link href="/admin/orders" className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-maroon/40 bg-white p-5 text-sm font-semibold text-maroon hover:bg-maroon/5">
          <ClipboardList className="h-4 w-4" /> Manage Orders
        </Link>
        <Link href="/admin/cities" className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-maroon/40 bg-white p-5 text-sm font-semibold text-maroon hover:bg-maroon/5">
          <Building2 className="h-4 w-4" /> Add City
        </Link>
      </div>
    </div>
  )
}
