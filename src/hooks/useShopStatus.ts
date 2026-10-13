'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ShopSettings } from '@/types'

// Live read of the shop open/closed flag for client pages (cart, checkout).
// Fails open like getShopStatus — the order API is the real gatekeeper.
export function useShopStatus(): Pick<ShopSettings, 'is_open' | 'closed_message'> {
  const [status, setStatus] = useState<Pick<ShopSettings, 'is_open' | 'closed_message'>>({
    is_open: true,
    closed_message: null,
  })

  useEffect(() => {
    let mounted = true
    try {
      createClient()
        .from('shop_settings')
        .select('is_open, closed_message')
        .eq('id', true)
        .single()
        .then(({ data }) => {
          if (mounted && data) setStatus(data)
        })
    } catch {
      // Supabase client unavailable — leave the shop treated as open.
    }
    return () => {
      mounted = false
    }
  }, [])

  return status
}
