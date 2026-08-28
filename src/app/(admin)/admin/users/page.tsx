'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Mail, Phone, ShieldCheck, ShieldOff, Users as UsersIcon, IndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface AdminUser extends Profile {
  orderCount: number
  totalSpent: number
  lastOrderAt: string | null
}

const ROLE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'Customers' },
  { key: 'admin', label: 'Admins' },
] as const

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [roleTab, setRoleTab] = useState<(typeof ROLE_TABS)[number]['key']>('all')
  const [search, setSearch] = useState('')
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Could not load users.')
      setLoading(false)
      return
    }
    setUsers(data.users ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const adminCount = users.filter((u) => u.role === 'admin').length
  const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0)

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleTab !== 'all' && u.role !== roleTab) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${u.name} ${u.phone} ${u.email ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [users, roleTab, search])

  async function handleRoleChange() {
    if (!roleTarget) return
    const nextRole = roleTarget.role === 'admin' ? 'user' : 'admin'
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roleTarget.id, role: nextRole }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(data.error || 'Could not update role.')
      return
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === roleTarget.id ? { ...u, role: nextRole } : u))
    )
    toast.success(
      nextRole === 'admin'
        ? `${roleTarget.name} is now an admin.`
        : `${roleTarget.name} is now a customer.`
    )
    setRoleTarget(null)
  }

  const stats = [
    { label: 'Total Users', value: users.length, icon: UsersIcon },
    { label: 'Admins', value: adminCount, icon: ShieldCheck },
    { label: 'Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee },
  ]

  return (
    <div className="p-4 md:p-8">
      <h1 className="font-serif text-2xl font-bold text-maroon">Users</h1>
      <p className="mt-1 text-sm text-stone-500">
        Everyone registered on the shop, with their order history.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 md:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-stone-200 border-t-[3px] border-t-maroon bg-white p-4"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon text-cream">
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2.5 font-serif text-xl font-bold text-maroon">{stat.value}</p>
              <p className="text-xs text-stone-500">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRoleTab(tab.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium',
              roleTab === tab.key ? 'bg-maroon text-white' : 'border border-maroon text-maroon'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, phone or email…"
        className="input-base mt-3 w-full bg-white md:w-80"
      />

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
              <th className="p-3">Customer</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Total Spent</th>
              <th className="p-3">Last Order</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-stone-400">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="border-b border-stone-100 last:border-0">
                  <td className="p-3 font-semibold text-maroon">{user.name}</td>
                  <td className="p-3">
                    <a
                      href={`tel:${user.phone}`}
                      className="flex items-center gap-1 text-stone-600 hover:text-maroon"
                    >
                      <Phone className="h-3 w-3" /> {user.phone}
                    </a>
                    {user.email && (
                      <a
                        href={`mailto:${user.email}`}
                        className="mt-0.5 flex items-center gap-1 text-xs text-stone-400 hover:text-maroon"
                      >
                        <Mail className="h-3 w-3" /> {user.email}
                      </a>
                    )}
                  </td>
                  <td className="p-3">
                    {user.orderCount > 0 ? (
                      <Link
                        href={`/admin/orders?search=${encodeURIComponent(user.phone)}`}
                        className="font-semibold text-maroon hover:underline"
                      >
                        {user.orderCount}
                      </Link>
                    ) : (
                      <span className="text-stone-400">0</span>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-maroon">₹{user.totalSpent.toFixed(0)}</td>
                  <td className="p-3 text-stone-500">
                    {user.lastOrderAt ? format(new Date(user.lastOrderAt), 'd MMM yyyy') : '—'}
                  </td>
                  <td className="p-3 text-stone-500">
                    {user.created_at ? format(new Date(user.created_at), 'd MMM yyyy') : '—'}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        user.role === 'admin'
                          ? 'bg-maroon/10 text-maroon'
                          : 'bg-stone-100 text-stone-500'
                      )}
                    >
                      {user.role === 'admin' ? 'Admin' : 'Customer'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setRoleTarget(user)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                        user.role === 'admin'
                          ? 'border-red-400 text-red-600 hover:bg-red-50'
                          : 'border-maroon text-maroon hover:bg-maroon/5'
                      )}
                    >
                      {user.role === 'admin' ? (
                        <>
                          <ShieldOff className="h-3.5 w-3.5" /> Remove Admin
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" /> Make Admin
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-maroon">
              {roleTarget?.role === 'admin'
                ? `Remove admin access from ${roleTarget?.name}?`
                : `Make ${roleTarget?.name} an admin?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            {roleTarget?.role === 'admin'
              ? 'They will lose access to this admin panel and become a regular customer.'
              : 'They will be able to manage products, orders, cities and other users.'}
          </p>
          <DialogFooter className="mt-4">
            <DialogClose nativeButton={false} render={<button className="btn-outline">Cancel</button>} />
            <button
              onClick={handleRoleChange}
              disabled={saving}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60',
                roleTarget?.role === 'admin'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-maroon hover:bg-maroon-light'
              )}
            >
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
