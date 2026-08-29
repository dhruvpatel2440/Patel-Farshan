'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Clock, Minus, Package, Plus, ShoppingCart, Truck, Zap } from 'lucide-react'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { ProductCard } from '@/components/product/ProductCard'
import { useCart } from '@/hooks/useCart'
import type { Product } from '@/types'

interface ProductDetailClientProps {
  product: Product
  related: Product[]
}

export function ProductDetailClient({ product, related }: ProductDetailClientProps) {
  const router = useRouter()
  const { addItem, getItemQuantity, updateQuantity } = useCart()
  const tiers = product.price_tiers ?? []
  const [selectedTierId, setSelectedTierId] = useState(tiers[0]?.id ?? '')
  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? tiers[0]
  const [qty, setQty] = useState(1)
  const [showStickyBar, setShowStickyBar] = useState(false)

  const outOfStock = !product.is_available || !selectedTier || selectedTier.stock_qty === 0
  const inCartQty = selectedTier ? getItemQuantity(product.id, selectedTier.id) : 0

  useEffect(() => {
    setQty(1)
  }, [selectedTierId])

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 420)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleAddToCart() {
    if (!selectedTier) return
    if (inCartQty > 0) {
      updateQuantity(product.id, selectedTier.id, inCartQty + qty)
    } else {
      for (let i = 0; i < qty; i++) addItem(product, selectedTier)
    }
  }

  function handleBuyNow() {
    handleAddToCart()
    router.push('/checkout')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-stone-500">
        <Link href="/" className="hover:text-maroon">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-maroon">
          Menu
        </Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/products?category=${product.category.id}`} className="hover:text-maroon">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-maroon">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
        {/* Image */}
        <div className="md:col-span-3">
          <div className="relative aspect-square overflow-hidden rounded-xl">
            {product.image_url ? (
              <Image src={product.image_url} alt={product.name} fill className="object-cover" priority />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream to-cream-dark text-8xl">
                🍽️
              </div>
            )}
            {product.is_featured && (
              <span className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-xs font-bold text-maroon shadow-sm">
                Bestseller
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2">
          <h1 className="font-gujarati text-3xl font-bold text-maroon">{product.name_gujarati}</h1>
          <p className="mb-1 text-lg text-stone-400">{product.name}</p>

          <div className="mt-2">
            {outOfStock ? (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                ✕ Out of Stock
              </span>
            ) : selectedTier.stock_qty < 10 ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                ⚡ Only {selectedTier.stock_qty} left
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                ✓ In Stock
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-serif text-3xl font-bold text-maroon">
              ₹{selectedTier?.price ?? product.price}
            </span>
            <span className="text-stone-400">/ {selectedTier?.unit_label ?? product.unit}</span>
          </div>

          {tiers.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTierId(t.id)}
                  disabled={t.stock_qty === 0}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    t.id === selectedTierId
                      ? 'border-maroon bg-maroon text-cream'
                      : 'border-cream-dark bg-white text-stone-600 hover:border-maroon/40'
                  }`}
                >
                  {t.unit_label}
                  {t.stock_qty === 0 ? ' (Out of stock)' : ''}
                </button>
              ))}
            </div>
          )}

          <OrnamentalDivider size="sm" />

          {product.description && (
            <p className="text-[15px] leading-relaxed text-stone-600">{product.description}</p>
          )}

          {!outOfStock && (
            <div className="card-base mt-5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-600">Quantity</span>
                <span className="text-sm font-semibold text-maroon">
                  Total: ₹{(selectedTier.price * qty).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-6">
                <button
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon text-cream hover:bg-maroon-light"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-2xl font-bold text-maroon">{qty}</span>
                <button
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(selectedTier.stock_qty, q + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon text-cream hover:bg-maroon-light"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-2.5">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" />
              {outOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={outOfStock}
              className="btn-outline flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              Buy Now
            </button>
          </div>

          <div className="mt-6 space-y-2 text-sm text-stone-500">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gold" /> Made fresh every morning
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gold" /> Delivery to selected cities
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gold" /> Minimum order applies per city
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title text-xl md:text-2xl">You May Also Like</h2>
          <OrnamentalDivider size="sm" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 md:grid md:grid-cols-4 md:overflow-visible">
            {related.map((p) => (
              <div key={p.id} className="w-40 shrink-0 md:w-auto">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky bottom bar */}
      {showStickyBar && !outOfStock && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-gold/30 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-maroon">{product.name}</p>
            <p className="text-xs text-stone-500">₹{selectedTier?.price ?? product.price}</p>
          </div>
          <button onClick={handleAddToCart} className="btn-primary shrink-0 !px-4 !py-2 text-sm">
            Add to Cart
          </button>
        </div>
      )}
    </div>
  )
}
