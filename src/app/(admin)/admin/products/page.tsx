'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { ProductFormDialog } from '@/components/admin/ProductFormDialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Category, Product } from '@/types'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  async function loadData() {
    const supabase = createClient()
    const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
      supabase.from('products').select('*').eq('is_deleted', false).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('display_order', { ascending: true }),
    ])
    setProducts((productsData as Product[]) ?? [])
    setCategories((categoriesData as Category[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function toggleAvailable(product: Product) {
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ is_available: !product.is_available })
      .eq('id', product.id)
    if (error) {
      toast.error('Could not update product.')
      return
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_available: !p.is_available } : p))
    )
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', deleteTarget.id)
    if (error) {
      toast.error('Could not delete product.')
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success('Product deleted.')
    }
    setDeleteTarget(null)
  }

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && p.category_id !== categoryFilter) return false
    if (inStockOnly && p.stock_qty === 0) return false
    return true
  })

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-maroon">Products</h1>
        <button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="input-base w-56 bg-white pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-base w-48 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="accent-maroon"
          />
          In Stock Only
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
              <th className="p-3">Image</th>
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Available</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-stone-400">
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const category = categories.find((c) => c.id === product.category_id)
                return (
                  <tr key={product.id} className="border-b border-stone-100 last:border-0">
                    <td className="p-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-cream">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg">🍽️</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-gujarati font-bold text-maroon">{product.name_gujarati}</p>
                      <p className="text-xs text-stone-400">{product.name}</p>
                    </td>
                    <td className="p-3 text-stone-600">{category?.name ?? '—'}</td>
                    <td className="p-3 font-semibold text-maroon">₹{product.price}</td>
                    <td
                      className={cn(
                        'p-3 font-semibold',
                        product.stock_qty === 0
                          ? 'text-red-600'
                          : product.stock_qty < 10
                            ? 'text-amber-600'
                            : 'text-stone-700'
                      )}
                    >
                      {product.stock_qty}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleAvailable(product)}
                        className={cn(
                          'relative h-5 w-9 rounded-full transition-colors',
                          product.is_available ? 'bg-green-500' : 'bg-stone-300'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                            product.is_available ? 'translate-x-4' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditing(product)
                            setFormOpen(true)
                          }}
                          className="text-maroon hover:text-maroon-light"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(product)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categories}
        onSaved={loadData}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-maroon">Delete {deleteTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">This cannot be undone.</p>
          <DialogFooter className="mt-4">
            <DialogClose nativeButton={false} render={<button className="btn-outline">Cancel</button>} />
            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
