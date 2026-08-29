'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import type { Category } from '@/types'
import { Toggle } from '@/components/admin/Toggle'

const EMPTY_FORM = { name: '', name_gujarati: '', display_order: '0', is_active: true }

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadCategories() {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadCategories()
  }, [])

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, display_order: String(categories.length + 1) })
    setImageFile(null)
    setImagePreview(null)
    setFormOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({
      name: cat.name,
      name_gujarati: cat.name_gujarati,
      display_order: String(cat.display_order),
      is_active: cat.is_active,
    })
    setImageFile(null)
    setImagePreview(cat.image_url ?? null)
    setFormOpen(true)
  }

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
    if (!form.name || !form.name_gujarati) {
      toast.error('Please fill both name fields.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        name_gujarati: form.name_gujarati,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
      }
      const res = await fetch('/api/admin/categories', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const saved = data.category as Category

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('productId', saved.id)
        formData.append('bucket', 'category-images')
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok) {
          await fetch('/api/admin/categories', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: saved.id, image_url: uploadData.url }),
          })
        }
      }

      toast.success('Category saved!')
      setFormOpen(false)
      loadCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save category.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(cat: Category) {
    const res = await fetch('/api/admin/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, is_active: !cat.is_active }),
    })
    if (res.ok) {
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c)))
    } else {
      toast.error('Could not update category.')
    }
  }

  async function handleMove(cat: Category, direction: 'up' | 'down') {
    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order)
    const index = sorted.findIndex((c) => c.id === cat.id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const other = sorted[swapIndex]
    const catOrder = cat.display_order
    const otherOrder = other.display_order

    await Promise.all([
      fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, display_order: otherOrder }),
      }),
      fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: other.id, display_order: catOrder }),
      }),
    ])
    loadCategories()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/categories?id=${deleteTarget.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Could not delete category.')
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Category deleted.')
    }
    setDeleteTarget(null)
  }

  const sorted = [...categories].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-maroon">Categories</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
              <th className="p-3">Order</th>
              <th className="p-3">Image</th>
              <th className="p-3">Gujarati Name</th>
              <th className="p-3">English Name</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-stone-400">
                  No categories yet.
                </td>
              </tr>
            ) : (
              sorted.map((cat, i) => (
                <tr key={cat.id} className="border-b border-stone-100 last:border-0">
                  <td className="p-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMove(cat, 'up')}
                        disabled={i === 0}
                        className="text-stone-400 hover:text-maroon disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(cat, 'down')}
                        disabled={i === sorted.length - 1}
                        className="text-stone-400 hover:text-maroon disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    {cat.image_url ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-cream">
                        <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-maroon text-sm font-bold text-gold">
                        {cat.name.slice(0, 1)}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-gujarati font-bold text-gold">{cat.name_gujarati}</td>
                  <td className="p-3 text-stone-600">{cat.name}</td>
                  <td className="p-3">
                    <Toggle
                      checked={cat.is_active}
                      onChange={() => toggleActive(cat)}
                      label={`${cat.is_active ? 'Deactivate' : 'Activate'} ${cat.name} category`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(cat)} className="text-maroon hover:text-maroon-light">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(cat)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-maroon">{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Display Order</label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Category Image</label>
              <label className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-stone-300 bg-cream">
                {imagePreview ? (
                  <Image src={imagePreview} alt="Preview" width={96} height={96} className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-5 w-5 text-stone-400" />
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="accent-maroon"
              />
              Active
            </label>
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? 'Saving…' : 'Save Category'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
