import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, Product } from '@/types'

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
  syncWithDB: (userId: string) => Promise<void>
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: 1 }] }
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.product.id !== productId) }
          }
          return {
            items: state.items.map((i) =>
              i.product.id === productId ? { ...i, quantity } : i
            ),
          }
        }),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

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
                quantity: item.quantity,
              },
              { onConflict: 'user_id,product_id', ignoreDuplicates: false }
            )
          }

          const { data: rows } = await supabase
            .from('cart_items')
            .select('quantity, product:products(*)')
            .eq('user_id', userId)

          if (rows) {
            const merged: CartItem[] = rows
              .filter((r) => r.product)
              .map((r) => ({
                product: r.product as unknown as Product,
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
      partialize: (state) => ({ items: state.items }),
    }
  )
)

export const selectCartCount = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0)

export const selectCartSubtotal = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
