'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ShopSettings } from '@/types'
import { Toggle } from '@/components/admin/Toggle'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadSettings() {
    const res = await fetch('/api/admin/shop-status')
    const data = await res.json()
    setSettings(data.shopSettings ?? null)
    setMessage(data.shopSettings?.closed_message ?? '')
    setLoading(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  async function toggleOpen() {
    if (!settings) return
    const nextOpen = !settings.is_open
    setSaving(true)
    const res = await fetch('/api/admin/shop-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_open: nextOpen, closed_message: message.trim() || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error || 'Could not update shop status.')
      return
    }
    setSettings(data.shopSettings)
    toast.success(nextOpen ? 'Shop is now open.' : 'Shop is now closed.')
  }

  async function saveMessage() {
    if (!settings) return
    setSaving(true)
    const res = await fetch('/api/admin/shop-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_open: settings.is_open, closed_message: message.trim() || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error || 'Could not save message.')
      return
    }
    setSettings(data.shopSettings)
    toast.success('Message saved.')
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-serif text-2xl font-bold text-maroon">Shop Status</h1>

      {loading || !settings ? (
        <p className="mt-4 text-stone-400">Loading…</p>
      ) : (
        <div className="mt-4 max-w-lg space-y-5 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-maroon">{settings.is_open ? 'Shop is Open' : 'Shop is Closed'}</p>
              <p className="text-sm text-stone-500">
                {settings.is_open
                  ? 'Customers can browse and place orders.'
                  : 'A "Shop Closed" banner is shown to visitors.'}
              </p>
            </div>
            <Toggle
              checked={settings.is_open}
              onChange={toggleOpen}
              disabled={saving}
              label={settings.is_open ? 'Close shop' : 'Open shop'}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Closed banner message (optional)
            </label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. We're closed for the day, back tomorrow at 10am."
              className="input-base"
            />
            <button
              onClick={saveMessage}
              disabled={saving}
              className="btn-primary mt-3 w-full justify-center"
            >
              {saving ? 'Saving…' : 'Save Message'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
