import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, PriceTier, Product } from '@/types'

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product, tier: PriceTier) => void
  removeItem: (productId: string, tierId: string) => void
  updateQuantity: (productId: string, tierId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
  syncWithDB: (userId: string) => Promise<void>
}

function sameLine(item: CartItem, productId: string, tierId: string) {
  return item.product.id === productId && item.tier.id === tierId
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, tier) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, product.id, tier.id))
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, product.id, tier.id) ? { ...i, quantity: i.quantity + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { product, tier, quantity: 1 }] }
        }),

      removeItem: (productId, tierId) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, tierId)),
        })),

      updateQuantity: (productId, tierId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => !sameLine(i, productId, tierId)) }
          }
          return {
            items: state.items.map((i) => (sameLine(i, productId, tierId) ? { ...i, quantity } : i)),
          }
        }),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + i.tier.price * i.quantity, 0),

      /**
       * Merge the local (guest) cart into the user's Supabase cart_items
       * on login, then treat Supabase as the source of truth going forward.
       */
      syncWithDB: async (userId: string) => {
        try {
          const supabase = createClient()
          const localItems = get().items

          for (const item of localItems) {
            await supabase.from('cart_items').upsert(
              {
                user_id: userId,
                product_id: item.product.id,
                tier_id: item.tier.id,
                quantity: item.quantity,
              },
              { onConflict: 'user_id,product_id,tier_id', ignoreDuplicates: false }
            )
          }

          const { data: rows } = await supabase
            .from('cart_items')
            .select('quantity, product:products(*), tier:product_price_tiers(*)')
            .eq('user_id', userId)

          if (rows) {
            const merged: CartItem[] = rows
              .filter((r) => r.product && r.tier)
              .map((r) => ({
                product: r.product as unknown as Product,
                tier: r.tier as unknown as PriceTier,
                quantity: r.quantity,
              }))
            set({ items: merged })
          }
        } catch {
          // Sync is best-effort — keep whatever is already in local state.
        }
      },
    }),
    {
      name: 'patel-farsan-cart',
      version: 1,
      partialize: (state) => ({ items: state.items }),
      // v0 cart items had no `tier` field — drop them rather than crash.
      migrate: (persisted) => {
        const state = persisted as { items?: CartItem[] }
        return { items: (state.items ?? []).filter((i) => i.tier?.id) }
      },
    }
  )
)

export const selectCartCount = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0)

export const selectCartSubtotal = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.tier.price * i.quantity, 0)
