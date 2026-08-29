'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, Phone, Printer } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_STATUS_FLOW } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'awaiting_payment', label: 'Awaiting Payment' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

const ACTIVE_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'out_for_delivery']

export default function AdminOrdersPage() {
  // Lets other pages deep-link into a filtered view, e.g. the Users page
  // linking to a customer's orders by phone number.
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]['key']>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'upi' | 'cod'>('all')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  async function loadOrders() {
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('placed_at', { ascending: false })

    const rows = data ?? []
    const userIds = [...new Set(rows.map((o) => o.user_id))]
    const { data: profilesData } = userIds.length
      ? await supabase.from('profiles').select('id, name, phone').in('id', userIds)
      : { data: [] }
    const profileById = new Map((profilesData ?? []).map((p) => [p.id, p]))
    const merged = rows.map((o) => ({ ...o, profile: profileById.get(o.user_id) ?? null }))

    setOrders(merged as Order[])
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const pendingVerifyCount = orders.filter((o) => o.payment_status === 'awaiting_verification').length

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusTab === 'active' && !ACTIVE_STATUSES.includes(o.order_status)) return false
      if (statusTab !== 'all' && statusTab !== 'active' && o.order_status !== statusTab) return false
      if (paymentFilter !== 'all' && o.payment_mode !== paymentFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const matchesNumber = o.order_number.toLowerCase().includes(q)
        const matchesCustomer =
          o.profile?.name?.toLowerCase().includes(q) || o.profile?.phone?.includes(q)
        if (!matchesNumber && !matchesCustomer) return false
      }
      return true
    })
  }, [orders, statusTab, paymentFilter, search])

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  async function handleVerifyPayment(order: Order) {
    const res = await fetch(`/api/admin/orders/${order.id}/verify-payment`, { method: 'PATCH' })
    if (res.ok) {
      toast.success('Payment verified.')
      loadOrders()
    } else {
      toast.error('Could not verify payment.')
    }
  }

  async function handleRejectPayment(order: Order) {
    const res = await fetch(`/api/admin/orders/${order.id}/reject-payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      toast.success('Payment rejected.')
      loadOrders()
    } else {
      toast.error('Could not reject payment.')
    }
  }

  async function handleStatusChange(order: Order, status: string) {
    const res = await fetch(`/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Order status updated.')
      loadOrders()
    } else {
      toast.error(data.error || 'Could not update status.')
    }
  }

  async function handleCancel() {
    if (!cancelTarget || !cancelReason.trim()) {
      toast.error('Please enter a cancellation reason.')
      return
    }
    const res = await fetch(`/api/admin/orders/${cancelTarget.id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    })
    if (res.ok) {
      toast.success('Order cancelled.')
      setCancelTarget(null)
      setCancelReason('')
      loadOrders()
    } else {
      toast.error('Could not cancel order.')
    }
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-serif text-2xl font-bold text-maroon">Orders</h1>

      {pendingVerifyCount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>⚠ {pendingVerifyCount} UPI payment(s) need verification</span>
          <button onClick={() => setStatusTab('awaiting_payment')} className="font-semibold underline">
            Verify Now
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusTab(tab.key)
              setPage(1)
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium',
              statusTab === tab.key ? 'bg-maroon text-white' : 'border border-maroon text-maroon'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order # or customer…"
          className="input-base w-64 bg-white"
        />
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'upi' | 'cod')}
          className="input-base w-40 bg-white"
        >
          <option value="all">All Payments</option>
          <option value="upi">UPI</option>
          <option value="cod">COD</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-stone-400">Loading…</p>
        ) : paginated.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-6 text-center text-stone-400">
            No orders found.
          </p>
        ) : (
          paginated.map((order) => {
            const expanded = expandedId === order.id
            const nextStatus =
              ADMIN_STATUS_FLOW[ADMIN_STATUS_FLOW.indexOf(order.order_status as (typeof ADMIN_STATUS_FLOW)[number]) + 1]

            return (
              <div key={order.id} className="rounded-xl border border-stone-200 bg-white">
                <button
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
                >
                  <span className="font-mono font-bold text-maroon">#{order.order_number}</span>
                  <span className="text-sm text-stone-600">
                    {order.profile?.name} · {order.profile?.phone}
                  </span>
                  <span className="font-semibold text-maroon">₹{order.total}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium">
                    {order.payment_mode.toUpperCase()}
                  </span>
                  <StatusBadge status={order.order_status} />
                  <ChevronDown className={cn('h-4 w-4 text-stone-400 transition-transform', expanded && 'rotate-180')} />
                </button>

                {expanded && (
                  <div className="grid grid-cols-1 gap-6 border-t border-stone-100 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-stone-400">Customer</p>
                      <p className="text-sm">{order.profile?.name}</p>
                      <a href={`tel:${order.profile?.phone}`} className="flex items-center gap-1 text-sm text-maroon">
                        <Phone className="h-3 w-3" /> {order.profile?.phone}
                      </a>
                      <p className="mt-2 text-sm text-stone-600">
                        Bus pickup — {order.address_snapshot?.city?.name}
                      </p>

                      <p className="mt-3 text-xs font-semibold uppercase text-stone-400">Items</p>
                      <div className="mt-1 space-y-1 text-sm">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.product_name}
                              {item.unit_label ? ` (${item.unit_label})` : ''} × {item.quantity}
                            </span>
                            <span>₹{item.line_total}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 space-y-0.5 border-t border-stone-100 pt-2 text-sm">
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

                    <div>
                      <p className="text-xs font-semibold uppercase text-stone-400">Payment</p>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={order.payment_status} />
                        <span className="text-sm text-stone-500">{order.payment_mode.toUpperCase()}</span>
                      </div>

                      {order.payment_status === 'awaiting_verification' && (
                        <div className="mt-2 rounded-lg bg-amber-50 p-3">
                          <p className="text-xs text-amber-800">
                            UTR: <span className="font-mono font-semibold">{order.utr_number}</span>
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => handleVerifyPayment(order)}
                              className="flex-1 rounded-lg bg-green-600 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              ✓ Verify Payment
                            </button>
                            <button
                              onClick={() => handleRejectPayment(order)}
                              className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      )}

                      <p className="mt-4 text-xs font-semibold uppercase text-stone-400">Update Status</p>
                      <div className="mt-1 flex gap-2">
                        {nextStatus && order.order_status !== 'cancelled' && order.order_status !== 'delivered' && (
                          <button
                            onClick={() => handleStatusChange(order, nextStatus)}
                            className="btn-primary !py-1.5 text-sm"
                          >
                            Mark as {nextStatus.replace(/_/g, ' ')}
                          </button>
                        )}
                        {order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
                          <button
                            onClick={() => setCancelTarget(order)}
                            className="rounded-lg border border-red-500 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => window.print()}
                        className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-dark"
                      >
                        <Printer className="h-4 w-4" /> Print Invoice
                      </button>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="mt-2 block text-sm font-semibold text-maroon hover:underline"
                      >
                        Open full page →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {filtered.length > pageSize && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline !py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-stone-500">
            Page {page} of {Math.ceil(filtered.length / pageSize)}
          </span>
          <button
            onClick={() => setPage((p) => (p * pageSize < filtered.length ? p + 1 : p))}
            disabled={page * pageSize >= filtered.length}
            className="btn-outline !py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-maroon">Cancel order #{cancelTarget?.order_number}?</DialogTitle>
          </DialogHeader>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation…"
            className="input-base min-h-20 resize-none"
          />
          <DialogFooter className="mt-4">
            <DialogClose nativeButton={false} render={<button className="btn-outline">Back</button>} />
            <button
              onClick={handleCancel}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Confirm Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
