'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { EmptyState } from '@/components/shared/EmptyState'
import { OrderCard } from '@/components/order/OrderCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Order } from '@/types'

const ACTIVE_STATUSES = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'awaiting_payment']

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

type TabKey = (typeof TABS)[number]['key']

const EMPTY_COPY: Record<TabKey, { heading: string; cta: boolean }> = {
  all: { heading: 'No orders yet', cta: true },
  active: { heading: 'No active orders', cta: true },
  delivered: { heading: 'No delivered orders yet', cta: false },
  cancelled: { heading: 'No cancelled orders', cta: false },
}

export default function MyOrdersPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('all')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?next=/orders')
      return
    }

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
  }, [authLoading, user, router])

  const filtered = orders.filter((o) => {
    if (tab === 'all') return true
    if (tab === 'active') return ACTIVE_STATUSES.includes(o.order_status)
    return o.order_status === tab
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="section-title text-2xl md:text-3xl">My Orders</h1>
      <OrnamentalDivider size="sm" />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-maroon text-white' : 'border border-maroon text-maroon'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-base space-y-2 p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="📦"
          heading={EMPTY_COPY[tab].heading}
          ctaLabel={EMPTY_COPY[tab].cta ? 'Start Shopping' : undefined}
          ctaHref={EMPTY_COPY[tab].cta ? '/products' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
