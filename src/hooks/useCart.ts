'use client'

import { useCartStore } from '@/store/cartStore'

export function useCart() {
  const store = useCartStore()

  function isInCart(productId: string, tierId: string) {
    return store.items.some((i) => i.product.id === productId && i.tier.id === tierId)
  }

  function getItemQuantity(productId: string, tierId: string) {
    return store.items.find((i) => i.product.id === productId && i.tier.id === tierId)?.quantity ?? 0
  }

  return { ...store, isInCart, getItemQuantity }
}
