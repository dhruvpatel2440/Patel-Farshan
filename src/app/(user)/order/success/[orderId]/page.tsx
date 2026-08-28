'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { OrderSuccessCard } from '@/components/order/OrderSuccessCard'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/types'

interface SuccessPageProps {
  params: Promise<{ orderId: string }>
}

export default function OrderSuccessPage({ params }: SuccessPageProps) {
  const { orderId } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace(`/login?next=/order/success/${orderId}`)
      return
    }
    const supabase = createClient()
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          router.replace('/orders')
          return
        }
        setOrder(data as Order)
        setLoading(false)
      })
  }, [authLoading, user, orderId, router])

  async function handleCopy() {
    if (!order) return
    await navigator.clipboard.writeText(order.order_number)
    toast.success('Order number copied!')
  }

  if (loading || !order) {
    return <div className="flex min-h-[60vh] items-center justify-center text-stone-500">Loading…</div>
  }

  return (
    <OrderSuccessCard
      title="Thank you for ordering!"
      subtitle="Your farsan is being prepared and will be on its way soon."
      orderNumber={order.order_number}
      onCopyOrderNumber={handleCopy}
      details={[
        {
          label: 'Payment',
          value: order.payment_mode === 'cod' ? 'Cash on delivery' : 'Verification pending',
        },
      ]}
      note="Confirmation details sent to your mobile"
      primaryHref={`/orders/${order.id}`}
      primaryLabel="View Order"
      secondaryHref="/products"
    />
  )
}
