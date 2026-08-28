'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatusHistory } from '@/types'

interface UseRealtimeOrderResult {
  order: Order | null
  history: OrderStatusHistory[]
  isLoading: boolean
  error: string | null
}

export function useRealtimeOrder(orderId: string): UseRealtimeOrderResult {
  const [order, setOrder] = useState<Order | null>(null)
  const [history, setHistory] = useState<OrderStatusHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    try {
      const supabase = createClient()
      const [{ data: orderData, error: orderError }, { data: historyData }, { data: itemsData }] =
        await Promise.all([
          supabase.from('orders').select('*').eq('id', orderId).single(),
          supabase
            .from('order_status_history')
            .select('*')
            .eq('order_id', orderId)
            .order('changed_at', { ascending: true }),
          supabase.from('order_items').select('*').eq('order_id', orderId),
        ])

      if (orderError) throw orderError
      setOrder({ ...(orderData as Order), items: itemsData ?? [] })
      setHistory((historyData as OrderStatusHistory[]) ?? [])
      setError(null)
    } catch {
      setError('Could not load this order.')
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()

    let supabase
    try {
      supabase = createClient()
    } catch {
      return
    }

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => fetchOrder()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_status_history', filter: `order_id=eq.${orderId}` },
        () => fetchOrder()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, fetchOrder])

  return { order, history, isLoading, error }
}
