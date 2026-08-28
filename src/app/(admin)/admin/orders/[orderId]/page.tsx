import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PrintButton } from '@/components/admin/PrintButton'
import { SHOP_NAME } from '@/lib/constants'

interface AdminOrderDetailProps {
  params: Promise<{ orderId: string }>
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailProps) {
  const { orderId } = await params
  const supabase = await createClient()

  const { data: orderRaw } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId)
    .single()

  if (!orderRaw) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, phone')
    .eq('id', orderRaw.user_id)
    .single()

  const order = { ...orderRaw, profile }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="font-serif text-2xl font-bold text-maroon">Order #{order.order_number}</h1>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <p className="font-serif text-lg font-bold text-maroon">{SHOP_NAME}</p>
            <p className="font-mono text-sm text-stone-500">#{order.order_number}</p>
            <p className="text-xs text-stone-400">
              {format(new Date(order.placed_at), 'd MMM yyyy, h:mm a')}
            </p>
          </div>
          <StatusBadge status={order.order_status} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-stone-400">Customer</p>
            <p className="text-sm">{order.profile?.name}</p>
            <p className="text-sm text-stone-500">{order.profile?.phone}</p>
            <p className="mt-2 text-sm text-stone-600">
              {order.address_snapshot?.address_line}, {order.address_snapshot?.area},{' '}
              {order.address_snapshot?.city?.name} — {order.address_snapshot?.pincode}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-stone-400">Payment</p>
            <p className="text-sm">{order.payment_mode.toUpperCase()}</p>
            <StatusBadge status={order.payment_status} className="mt-1" />
          </div>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase text-stone-400">Items</p>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
              <th className="py-1.5">Item</th>
              <th className="py-1.5">Qty</th>
              <th className="py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: { id: string; product_name: string; quantity: number; line_total: number }) => (
              <tr key={item.id} className="border-b border-stone-100 last:border-0">
                <td className="py-1.5">{item.product_name}</td>
                <td className="py-1.5">{item.quantity}</td>
                <td className="py-1.5 text-right">₹{item.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
          <div className="flex justify-between text-stone-500">
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>Delivery</span>
            <span>₹{order.delivery_charge}</span>
          </div>
          <div className="flex justify-between font-bold text-maroon">
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
        </div>
      </div>

      <PrintButton />
    </div>
  )
}
