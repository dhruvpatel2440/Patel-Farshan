'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Category, Product } from '@/types'

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  categories: Category[]
  onSaved: () => void
}

const EMPTY_FORM = {
  name: '',
  name_gujarati: '',
  category_id: '',
  description: '',
  price: '',
  unit: '250g',
  stock_qty: '',
  is_available: true,
  is_featured: false,
}

export function ProductFormDialog({ open, onOpenChange, product, categories, onSaved }: ProductFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        name_gujarati: product.name_gujarati,
        category_id: product.category_id,
        description: product.description ?? '',
        price: String(product.price),
        unit: product.unit,
        stock_qty: String(product.stock_qty),
        is_available: product.is_available,
        is_featured: product.is_featured,
      })
      setImagePreview(product.image_url ?? null)
    } else {
      setForm(EMPTY_FORM)
      setImagePreview(null)
    }
    setImageFile(null)
  }, [product, open])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2MB or smaller.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.name || !form.name_gujarati || !form.category_id || !form.price) {
      toast.error('Please fill all required fields.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        name_gujarati: form.name_gujarati,
        category_id: form.category_id,
        description: form.description,
        price: Number(form.price),
        unit: form.unit,
        stock_qty: Number(form.stock_qty) || 0,
        is_available: form.is_available,
        is_featured: form.is_featured,
      }

      const res = await fetch('/api/admin/products', {
        method: product ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product ? { id: product.id, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const savedProduct = data.product as Product

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('productId', savedProduct.id)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok) {
          await fetch('/api/admin/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: savedProduct.id, image_url: uploadData.url }),
          })
        }
      }

      toast.success('Product saved!')
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-maroon">{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Name (English)</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Name (Gujarati)</label>
              <input
                value={form.name_gujarati}
                onChange={(e) => setForm((f) => ({ ...f, name_gujarati: e.target.value }))}
                className="input-base font-gujarati"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              className="input-base"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input-base min-h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Price (₹)</label>
              <input
                type="number"
                min={1}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Unit</label>
              <input
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="input-base"
                placeholder="250g"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Stock Qty</label>
              <input
                type="number"
                min={0}
                value={form.stock_qty}
                onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))}
                className="input-base"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))}
                className="accent-maroon"
              />
              Available
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                className="accent-maroon"
              />
              Featured (homepage)
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Product Image</label>
            <label className="flex h-40 w-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-stone-300 bg-cream">
              {imagePreview ? (
                <Image src={imagePreview} alt="Preview" width={160} height={160} className="h-full w-full object-cover" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-stone-400" />
                  <span className="mt-1 text-xs text-stone-400">Click to upload</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
            {saving ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
