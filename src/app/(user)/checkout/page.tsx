'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { AddressCard } from '@/components/checkout/AddressCard'
import { AddressForm } from '@/components/checkout/AddressForm'
import { useCartStore } from '@/store/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Address, City, PaymentMode } from '@/types'
import type { AddressInput } from '@/lib/validations'

const STEPS = ['Address', 'Payment', 'Review']

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)

  const [hydrated, setHydrated] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi')
  const [instructions, setInstructions] = useState('')
  const [isPlacing, setIsPlacing] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  useEffect(() => setHydrated(true), [])

  // Guards
  useEffect(() => {
    if (!hydrated || isPlacing) return
    if (items.length === 0) router.replace('/cart')
  }, [hydrated, items.length, isPlacing, router])

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login?next=/checkout')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('addresses')
      .select('*, city:cities(*)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const list = (data as Address[]) ?? []
        setAddresses(list)
        const def = list.find((a) => a.is_default) ?? list[0]
        if (def) setSelectedAddressId(def.id)
        else setShowNewAddressForm(true)
        setLoadingAddresses(false)
      })
  }, [user])

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null
  const city = selectedAddress?.city as City | undefined
  const deliveryCharge = city?.delivery_charge ?? 0
  const total = subtotal + deliveryCharge
  const minOrderMet = !city || subtotal >= city.min_order_value

  async function handleSaveAddress(values: AddressInput, selectedCity: City) {
    if (!user) return
    setSavingAddress(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...values, user_id: user.id })
      .select('*, city:cities(*)')
      .single()
    setSavingAddress(false)

    if (error || !data) {
      toast.error('Could not save address. Please try again.')
      return
    }

    const newAddress = data as Address
    setAddresses((prev) => [...prev, newAddress])
    setSelectedAddressId(newAddress.id)
    setShowNewAddressForm(false)
    void selectedCity
  }

  async function handlePlaceOrder() {
    if (!selectedAddress || !minOrderMet) return
    setIsPlacing(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          address: selectedAddress,
          paymentMode,
          deliveryInstructions: instructions,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Could not place your order.')
        setIsPlacing(false)
        return
      }

      clearCart()
      const orderId = data.order.id
      router.push(paymentMode === 'upi' ? `/checkout/payment/${orderId}` : `/order/success/${orderId}`)
    } catch {
      toast.error('Network error. Please try again.')
      setIsPlacing(false)
    }
  }

  if (!hydrated || authLoading || items.length === 0 || !user) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="section-title text-2xl md:text-3xl">Checkout</h1>

      {/* Progress indicator */}
      <div className="my-6 flex items-center justify-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  i === 0 || (i === 1 && selectedAddress) || (i === 2 && selectedAddress)
                    ? 'bg-maroon text-cream'
                    : 'bg-stone-200 text-stone-500'
                )}
              >
                {i + 1}
              </span>
              <span className="text-[10px] text-stone-500">{step}</span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-8 bg-stone-300 md:w-16" />}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="flex-1 space-y-8">
          {/* Address */}
          <section>
            <h2 className="mb-3 font-serif text-lg font-bold text-maroon">① Delivery Address</h2>
            {loadingAddresses ? (
              <p className="text-sm text-stone-500">Loading addresses…</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    address={addr}
                    isSelected={selectedAddressId === addr.id}
                    onSelect={() => {
                      setSelectedAddressId(addr.id)
                      setShowNewAddressForm(false)
                    }}
                  />
                ))}

                {!showNewAddressForm ? (
                  <button
                    onClick={() => setShowNewAddressForm(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-maroon/40 p-4 text-sm font-semibold text-maroon hover:bg-maroon/5"
                  >
                    <Plus className="h-4 w-4" /> Add New Address
                  </button>
                ) : (
                  <div className="card-base p-4">
                    <AddressForm
                      onSubmit={handleSaveAddress}
                      isSubmitting={savingAddress}
                      subtotal={subtotal}
                      submitLabel="Save & Use This Address"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Payment */}
          {selectedAddress && (
            <section>
              <h2 className="mb-3 font-serif text-lg font-bold text-maroon">② Payment Method</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setPaymentMode('upi')}
                  className={cn(
                    'relative rounded-xl border-2 bg-gradient-to-br from-gold/10 to-white p-4 text-left transition-colors',
                    paymentMode === 'upi' ? 'border-maroon' : 'border-cream-dark'
                  )}
                >
                  {paymentMode === 'upi' && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-maroon text-cream">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span className="text-3xl">📱</span>
                  <p className="mt-2 font-bold text-maroon">Pay via UPI</p>
                  <p className="text-xs text-stone-500">GPay · PhonePe · Paytm · Any UPI app</p>
                  <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                    Recommended
                  </span>
                </button>

                <button
                  onClick={() => setPaymentMode('cod')}
                  className={cn(
                    'relative rounded-xl border-2 bg-white p-4 text-left transition-colors',
                    paymentMode === 'cod' ? 'border-maroon' : 'border-cream-dark'
                  )}
                >
                  {paymentMode === 'cod' && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-maroon text-cream">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span className="text-3xl">💵</span>
                  <p className="mt-2 font-bold text-maroon">Cash on Delivery</p>
                  <p className="text-xs text-stone-500">Pay when your order arrives</p>
                  <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    Available
                  </span>
                </button>
              </div>
            </section>
          )}

          {/* Review */}
          {selectedAddress && (
            <section>
              <h2 className="mb-3 font-serif text-lg font-bold text-maroon">③ Review & Place Order</h2>
              <div className="card-base space-y-3 p-4">
                <p className="text-sm text-stone-600">
                  Delivering to: <span className="font-semibold text-maroon">{selectedAddress.full_name}</span>,{' '}
                  bus pickup at {city?.name}
                </p>

                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-2 text-sm">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-cream">
                        {item.product.image_url ? (
                          <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm">🍽️</div>
                        )}
                      </div>
                      <span className="flex-1 font-gujarati text-maroon">{item.product.name_gujarati}</span>
                      <span className="text-stone-500">×{item.quantity}</span>
                      <span className="w-14 text-right font-semibold text-maroon">
                        ₹{(item.product.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                <OrnamentalDivider size="sm" />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery ({city?.name})</span>
                    <span>₹{deliveryCharge.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-cream-dark pt-1.5 font-bold text-maroon">
                    <span>Total</span>
                    <span>₹{total.toFixed(0)}</span>
                  </div>
                </div>

                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Ring bell twice · Ground floor flat 3"
                  className="input-base min-h-16 resize-none"
                />

                {!minOrderMet && (
                  <p className="text-xs font-semibold text-red-600">
                    Minimum order for {city?.name} is ₹{city?.min_order_value}. Add more items to continue.
                  </p>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacing || !minOrderMet}
                  className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {isPlacing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {paymentMode === 'cod'
                    ? `Place Order — ₹${total.toFixed(0)}`
                    : `Proceed to Payment — ₹${total.toFixed(0)}`}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Sticky summary (desktop) */}
        <div className="hidden w-72 shrink-0 md:block">
          <div className="card-base sticky top-24 p-4">
            <h3 className="font-serif font-bold text-maroon">Order Summary</h3>
            <div className="mt-3 flex justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(0)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm text-stone-600">
              <span>Delivery</span>
              <span>{city ? `₹${deliveryCharge.toFixed(0)}` : '—'}</span>
            </div>
            <OrnamentalDivider size="sm" />
            <div className="flex justify-between font-bold text-maroon">
              <span>Total</span>
              <span>₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
