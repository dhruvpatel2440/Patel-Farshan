'use client'

import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useCartStore } from '@/store/cartStore'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/types'

const ACTIVE_STATUSES = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'awaiting_payment']

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const items = order.items ?? []
  const preview = items.slice(0, 3)
  const extra = items.length - preview.length
  const isActive = ACTIVE_STATUSES.includes(order.order_status)

  async function handleReorder() {
    const supabase = createClient()
    const tierIds = items.map((i) => i.tier_id).filter((id): id is string => !!id)
    const { data: tierRows } = tierIds.length
      ? await supabase.from('product_price_tiers').select('*, product:products(*)').in('id', tierIds)
      : { data: [] }

    const availableTiers = tierRows ?? []
    let addedCount = 0
    for (const item of items) {
      const tierRow = item.tier_id ? availableTiers.find((t) => t.id === item.tier_id) : undefined
      const product = tierRow?.product
      if (tierRow && product && product.is_available && !product.is_deleted) {
        for (let i = 0; i < item.quantity; i++) addItem(product, tierRow)
        addedCount++
      }
    }

    const skipped = items.length - addedCount
    if (addedCount > 0) {
      toast.success(
        `${addedCount} item${addedCount > 1 ? 's' : ''} added to cart${
          skipped > 0 ? ` · + ${skipped} unavailable item${skipped > 1 ? 's' : ''} skipped` : ''
        }`
      )
    } else {
      toast.error('These items are no longer available.')
    }
  }

  return (
    <div className="card-product p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[13px] font-bold text-maroon">#{order.order_number}</p>
        <StatusBadge status={order.order_status} />
      </div>
      <p className="mt-0.5 text-[11px] text-stone-400">
        {format(new Date(order.placed_at), 'd MMM yyyy, h:mm a')}
      </p>

      {preview.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          {preview.map((item) => (
            <div key={item.id} className="relative h-8 w-8 overflow-hidden rounded-md bg-cream">
              {item.product_image_url ? (
                <Image src={item.product_image_url} alt={item.product_name} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs">🍽️</div>
              )}
            </div>
          ))}
          {extra > 0 && (
            <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-500">
              +{extra} more
            </span>
          )}
        </div>
      )}

      <p className="mt-2 text-[10px] text-stone-400">
        {items.length} item{items.length !== 1 ? 's' : ''} · ₹{order.total} ·{' '}
        {order.payment_mode === 'cod' ? 'COD' : 'UPI'}
      </p>

      <div className="mt-3 flex gap-2">
        <Link
          href={`/orders/${order.id}`}
          className={isActive ? 'btn-primary flex-1 justify-center !py-2 text-sm' : 'btn-outline flex-1 justify-center !py-2 text-sm'}
        >
          {isActive ? 'Track Order' : 'View Details'}
        </Link>
        <button
          onClick={handleReorder}
          className="btn-outline flex items-center justify-center gap-1 !py-2 text-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reorder
        </button>
      </div>
    </div>
  )
}
