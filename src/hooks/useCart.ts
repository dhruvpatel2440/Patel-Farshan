'use client'

import { useCartStore } from '@/store/cartStore'

export function useCart() {
  const store = useCartStore()

  function isInCart(productId: string) {
    return store.items.some((i) => i.product.id === productId)
  }

  function getItemQuantity(productId: string) {
    return store.items.find((i) => i.product.id === productId)?.quantity ?? 0
  }

  return { ...store, isInCart, getItemQuantity }
}
