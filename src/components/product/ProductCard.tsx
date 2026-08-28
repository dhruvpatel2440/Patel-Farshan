'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import type { Product } from '@/types'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  showAddToCart?: boolean
}

export function ProductCard({ product, showAddToCart = true }: ProductCardProps) {
  const { addItem, removeItem, updateQuantity, getItemQuantity } = useCart()
  const quantity = getItemQuantity(product.id)
  const outOfStock = !product.is_available || product.stock_qty === 0
  const lowStock = !outOfStock && product.stock_qty < 10

  return (
    <div className="card-product group flex flex-col">
      <Link href={`/products/${product.id}`} className="relative block aspect-square overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream to-cream-dark text-5xl">
            🍽️
          </div>
        )}

        {product.is_featured && (
          <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-maroon shadow-sm">
            Bestseller
          </span>
        )}
        {lowStock && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            Only {product.stock_qty} left
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link href={`/products/${product.id}`}>
          <p className="truncate font-gujarati text-sm font-bold text-maroon">
            {product.name_gujarati}
          </p>
          <p className="truncate text-xs text-stone-400">{product.name}</p>
        </Link>

        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="font-serif text-base font-bold text-maroon">₹{product.price}</span>
          <span className="text-xs text-stone-400">/ {product.unit}</span>
        </div>

        <div className="my-2 h-px bg-gold/20" />

        {showAddToCart && (
          <div className="mt-auto">
            {outOfStock ? (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-lg bg-stone-200 py-2 text-xs font-semibold text-stone-500"
              >
                Out of Stock
              </button>
            ) : quantity > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between rounded-lg bg-maroon px-2 py-1.5">
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-cream/20 text-cream hover:bg-cream/30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-sm font-bold text-cream">{quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => updateQuantity(product.id, quantity + 1)}
                    disabled={quantity >= product.stock_qty}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-cream/20 text-cream hover:bg-cream/30 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(product.id)}
                  className="flex items-center justify-center gap-1 text-[11px] text-stone-400 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => addItem(product)}
                className={cn(
                  'flex w-full items-center justify-center gap-1.5 rounded-lg bg-maroon py-2 text-xs font-semibold text-cream',
                  'transition-all duration-150 hover:bg-maroon-light active:scale-[0.98]'
                )}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Add to Cart
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
