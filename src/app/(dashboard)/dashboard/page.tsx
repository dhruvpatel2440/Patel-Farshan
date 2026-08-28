'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { EmptyState } from '@/components/shared/EmptyState'
import { OrderCard } from '@/components/order/OrderCard'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/types'

const ACTIVE_STATUSES = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'awaiting_payment']

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login?next=/dashboard')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) ?? [])
        setLoading(false)
      })
  }, [user])

  if (authLoading || !user) {
    return <div className="flex min-h-[60vh] items-center justify-center text-stone-500">Loading…</div>
  }

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.order_status)).length
  const recentOrders = orders.slice(0, 3)

  return (
    <div>
      {/* Header */}
      <div className="bg-maroon px-4 py-8 text-center md:px-6">
        <p className="text-sm text-cream/70">Welcome back,</p>
        <p className="font-serif text-2xl font-bold text-cream">{profile?.name || 'there'}</p>
        <p className="mt-1 text-xs text-gold">
          {orders.length} order{orders.length !== 1 ? 's' : ''} placed
          {activeCount > 0 && ` · ${activeCount} active`}
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">
        {/* Recent orders */}
        <div className="flex items-center justify-between">
          <h2 className="section-title text-lg md:text-xl">Recent Orders</h2>
          {orders.length > 0 && (
            <Link href="/orders" className="flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-dark">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <OrnamentalDivider size="sm" className="!ml-0 !justify-start" />

        {loading ? (
          <p className="text-sm text-stone-400">Loading orders…</p>
        ) : recentOrders.length === 0 ? (
          <EmptyState
            emoji="📦"
            heading="No orders yet"
            subtext="Your recent orders will show up here."
            ctaLabel="Start Shopping"
            ctaHref="/products"
          />
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
