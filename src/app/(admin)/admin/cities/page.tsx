'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import type { City } from '@/types'
import { Toggle } from '@/components/admin/Toggle'

const EMPTY_FORM = {
  name: '',
  delivery_charge: '',
  min_order_kg: '',
  estimated_delivery_time: '',
  is_active: true,
}

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<City | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<City | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadCities() {
    const res = await fetch('/api/admin/cities')
    const data = await res.json()
    setCities(data.cities ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadCities()
  }, [])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(city: City) {
    setEditing(city)
    setForm({
      name: city.name,
      delivery_charge: String(city.delivery_charge),
      min_order_kg: String(city.min_order_kg),
      estimated_delivery_time: city.estimated_delivery_time ?? '',
      is_active: city.is_active,
    })
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.delivery_charge || !form.min_order_kg) {
      toast.error('Please fill all fields.')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name,
      delivery_charge: Number(form.delivery_charge),
      min_order_kg: Number(form.min_order_kg),
      estimated_delivery_time: form.estimated_delivery_time.trim() || null,
      is_active: form.is_active,
    }
    const res = await fetch('/api/admin/cities', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error || 'Could not save city.')
      return
    }
    toast.success('City saved!')
    setFormOpen(false)
    loadCities()
  }

  async function toggleActive(city: City) {
    const res = await fetch('/api/admin/cities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: city.id, is_active: !city.is_active }),
    })
    if (res.ok) {
      setCities((prev) => prev.map((c) => (c.id === city.id ? { ...c, is_active: !c.is_active } : c)))
    } else {
      toast.error('Could not update city.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/cities?id=${deleteTarget.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Could not delete city.')
    } else {
      setCities((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('City deleted.')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-maroon">Delivery Cities</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add City
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
              <th className="p-3">City Name</th>
              <th className="p-3">Delivery Charge</th>
              <th className="p-3">Min Order</th>
              <th className="p-3">Est. Delivery Time</th>
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
            ) : cities.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-stone-400">
                  No cities yet.
                </td>
              </tr>
            ) : (
              cities.map((city) => (
                <tr key={city.id} className="border-b border-stone-100 last:border-0">
                  <td className="p-3 font-semibold text-maroon">{city.name}</td>
                  <td className="p-3">₹{city.delivery_charge}</td>
                  <td className="p-3">{city.min_order_kg} kg</td>
                  <td className="p-3 text-stone-600">{city.estimated_delivery_time || '—'}</td>
                  <td className="p-3">
                    <Toggle
                      checked={city.is_active}
                      onChange={() => toggleActive(city)}
                      label={`${city.is_active ? 'Deactivate' : 'Activate'} delivery to ${city.name}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(city)} className="text-maroon hover:text-maroon-light">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(city)} className="text-red-500 hover:text-red-700">
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
            <DialogTitle className="text-maroon">{editing ? 'Edit City' : 'Add City'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">City Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Delivery Charge (₹)</label>
              <input
                type="number"
                min={0}
                value={form.delivery_charge}
                onChange={(e) => setForm((f) => ({ ...f, delivery_charge: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Minimum Order (Kg)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.min_order_kg}
                onChange={(e) => setForm((f) => ({ ...f, min_order_kg: e.target.value }))}
                placeholder="e.g. 1"
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Estimated Delivery Time
              </label>
              <input
                value={form.estimated_delivery_time}
                onChange={(e) => setForm((f) => ({ ...f, estimated_delivery_time: e.target.value }))}
                placeholder="e.g. 1-2 days"
                className="input-base"
              />
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
              {saving ? 'Saving…' : 'Save City'}
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
