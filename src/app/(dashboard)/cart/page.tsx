'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { EmptyState } from '@/components/shared/EmptyState'
import { useCartStore } from '@/store/cartStore'
import type { CartItem } from '@/types'

export default function CartPage() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const addBack = useCartStore((s) => s.addItem)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => setHydrated(true), [])

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  function handleRemove(item: CartItem) {
    removeItem(item.product.id)
    toast(`${item.product.name} removed from cart`, {
      action: {
        label: 'Undo',
        onClick: () => {
          for (let i = 0; i < item.quantity; i++) addBack(item.product)
        },
      },
      duration: 5000,
    })
  }

  if (!hydrated) return null

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14">
        <EmptyState
          emoji="🥣"
          heading="Your cart is empty"
          subtext="Looks like you haven't added anything yet."
          ctaLabel="Start Shopping"
          ctaHref="/products"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 md:px-6 md:py-10 md:pb-10">
      <h1 className="section-title text-2xl md:text-3xl">Your Cart</h1>
      <OrnamentalDivider size="sm" />

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Items */}
        <div className="flex-1 space-y-3">
          {items.map((item) => (
            <div key={item.product.id} className="card-base flex gap-3 p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-cream">
                {item.product.image_url ? (
                  <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <p className="font-gujarati text-sm font-bold text-maroon">
                    {item.product.name_gujarati}
                  </p>
                  <p className="text-xs text-stone-400">{item.product.name}</p>
                  <p className="text-xs text-stone-500">
                    ₹{item.product.price} / {item.product.unit}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-lg bg-maroon px-2 py-1">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/20 text-cream hover:bg-cream/30"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-4 text-center text-sm font-bold text-cream">{item.quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock_qty}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/20 text-cream hover:bg-cream/30 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-serif font-bold text-maroon">
                      ₹{(item.product.price * item.quantity).toFixed(0)}
                    </span>
                    <button
                      aria-label="Remove item"
                      onClick={() => handleRemove(item)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="md:w-80 md:shrink-0">
          <div className="card-base sticky top-24 hidden p-5 md:block">
            <h2 className="font-serif text-lg font-bold text-maroon">Order Summary</h2>
            <div className="mt-4 flex justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(0)}</span>
            </div>
            <div className="mt-1.5 flex justify-between text-sm italic text-stone-400">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <OrnamentalDivider size="sm" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-stone-700">Total</span>
              <span className="font-serif text-2xl font-bold text-maroon">₹{subtotal.toFixed(0)}</span>
            </div>
            <button onClick={() => router.push('/checkout')} className="btn-primary mt-5 w-full justify-center">
              Proceed to Checkout
            </button>
            <Link
              href="/products"
              className="mt-3 block text-center text-sm font-medium text-stone-500 hover:text-maroon"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile fixed bottom bar */}
      <div className="fixed bottom-16 left-0 right-0 z-40 flex items-center justify-between border-t border-gold/30 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:hidden">
        <span className="font-serif font-bold text-maroon">Total: ₹{subtotal.toFixed(0)}</span>
        <button onClick={() => router.push('/checkout')} className="btn-primary !px-5 !py-2 text-sm">
          Checkout →
        </button>
      </div>
    </div>
  )
}
