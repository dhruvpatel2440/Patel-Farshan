'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, MapPin, Pencil, Plus, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { AddressCard } from '@/components/checkout/AddressCard'
import { AddressForm } from '@/components/checkout/AddressForm'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/store/cartStore'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Address, City } from '@/types'
import type { AddressInput } from '@/lib/validations'

type TabKey = 'profile' | 'addresses'

export default function AccountPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  const clearCart = useCartStore((s) => s.clearCart)

  const [tab, setTab] = useState<TabKey>('profile')
  const [orderCount, setOrderCount] = useState(0)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login?next=/account')
  }, [authLoading, user, router])

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setEmail(profile.email || '')
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('addresses')
      .select('*, city:cities(*)')
      .eq('user_id', user.id)
      .then(({ data }) => setAddresses((data as Address[]) ?? []))

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setOrderCount(count ?? 0))
  }, [user])

  async function handleSaveProfile() {
    if (!user) return
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ name, email }).eq('id', user.id)
    setSavingProfile(false)
    if (error) toast.error('Could not save changes.')
    else toast.success('Profile updated.')
  }

  async function handleUpdatePassword() {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated.')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    }
  }

  async function handleSaveAddress(values: AddressInput, city: City) {
    if (!user) return
    const supabase = createClient()

    if (editingAddress) {
      const { data, error } = await supabase
        .from('addresses')
        .update(values)
        .eq('id', editingAddress.id)
        .select('*, city:cities(*)')
        .single()
      if (error || !data) {
        toast.error('Could not update address.')
        return
      }
      setAddresses((prev) => prev.map((a) => (a.id === editingAddress.id ? (data as Address) : a)))
      toast.success('Address updated.')
    } else {
      const { data, error } = await supabase
        .from('addresses')
        .insert({ ...values, user_id: user.id })
        .select('*, city:cities(*)')
        .single()
      if (error || !data) {
        toast.error('Could not save address.')
        return
      }
      setAddresses((prev) => [...prev, data as Address])
      toast.success('Address added.')
    }

    void city
    setAddressDialogOpen(false)
    setEditingAddress(null)
  }

  async function handleDeleteAddress() {
    if (!deleteTarget) return
    const supabase = createClient()
    const { error } = await supabase.from('addresses').delete().eq('id', deleteTarget.id)
    if (error) {
      toast.error('Could not delete address.')
    } else {
      setAddresses((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      toast.success('Address deleted.')
    }
    setDeleteTarget(null)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearCart()
    router.push('/')
    router.refresh()
  }

  if (authLoading || !user) {
    return <div className="flex min-h-[60vh] items-center justify-center text-stone-500">Loading…</div>
  }

  const initials = (profile?.name || 'U').slice(0, 1).toUpperCase()
  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear()

  return (
    <div>
      {/* Profile header */}
      <div className="bg-maroon px-4 py-8 text-center md:px-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold text-xl font-bold text-maroon">
          {initials}
        </div>
        <p className="mt-2 font-serif text-lg font-bold text-cream">{profile?.name || 'User'}</p>
        <p className="text-sm text-cream/70">+91 {profile?.phone}</p>
        <p className="mt-1 text-xs text-gold">
          Member since {memberSince} · {orderCount} order{orderCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6 md:py-8">
        {/* Nav */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide md:w-48 md:shrink-0 md:flex-col">
          <button
            onClick={() => setTab('profile')}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
              tab === 'profile' ? 'bg-maroon text-white' : 'text-stone-600 hover:bg-maroon/5'
            )}
          >
            <UserIcon className="h-4 w-4" /> My Profile
          </button>
          <button
            onClick={() => setTab('addresses')}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
              tab === 'addresses' ? 'bg-maroon text-white' : 'text-stone-600 hover:bg-maroon/5'
            )}
          >
            <MapPin className="h-4 w-4" /> My Addresses
          </button>
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'profile' && (
            <div className="card-base space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Mobile Number
                </label>
                <input value={`+91 ${profile?.phone ?? ''}`} readOnly className="input-base cursor-not-allowed bg-stone-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" />
              </div>
              <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>

              <div className="border-t border-cream-dark pt-4">
                <button
                  onClick={() => setShowPasswordForm((v) => !v)}
                  className="text-sm font-semibold text-gold hover:text-gold-dark"
                >
                  Change Password {showPasswordForm ? '▲' : '▼'}
                </button>
                {showPasswordForm && (
                  <div className="mt-3 space-y-3">
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-base"
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-base"
                    />
                    <button onClick={handleUpdatePassword} disabled={savingPassword} className="btn-outline">
                      {savingPassword ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'addresses' && (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  isSelected={false}
                  onSelect={() => {}}
                  onEdit={() => {
                    setEditingAddress(addr)
                    setAddressDialogOpen(true)
                  }}
                  onDelete={() => setDeleteTarget(addr)}
                />
              ))}

              <button
                onClick={() => {
                  setEditingAddress(null)
                  setAddressDialogOpen(true)
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-maroon/40 p-4 text-sm font-semibold text-maroon hover:bg-maroon/5"
              >
                <Plus className="h-4 w-4" /> Add New Address
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Address Dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-cream sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 font-serif text-maroon">
              <Pencil className="h-4 w-4" /> {editingAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <AddressForm
            key={editingAddress?.id ?? 'new'}
            onSubmit={handleSaveAddress}
            address={editingAddress}
            submitLabel={editingAddress ? 'Save Changes' : 'Add Address'}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-maroon">Delete this address?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">This action cannot be undone.</p>
          <DialogFooter className="mt-4">
            <DialogClose nativeButton={false} render={<button className="btn-outline">Cancel</button>} />
            <button onClick={handleDeleteAddress} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout confirmation */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-maroon">Logging out of Patel Farsan?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <DialogClose nativeButton={false} render={<button className="btn-outline">Cancel</button>} />
            <button onClick={handleLogout} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Logout
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
