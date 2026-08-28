'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, type AddressInput } from '@/lib/validations'
import type { City } from '@/types'

interface AddressFormProps {
  onSubmit: (values: AddressInput, city: City) => void
  submitLabel?: string
  isSubmitting?: boolean
  subtotal?: number
}

export function AddressForm({
  onSubmit,
  submitLabel = 'Save Address',
  isSubmitting,
  subtotal = 0,
}: AddressFormProps) {
  const [cities, setCities] = useState<City[]>([])
  const [loadingCities, setLoadingCities] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      address_line: '',
      area: '',
      city_id: '',
      pincode: '',
      is_default: false,
    },
  })

  const selectedCityId = watch('city_id')
  const selectedCity = cities.find((c) => c.id === selectedCityId)
  const diff = selectedCity ? selectedCity.min_order_value - subtotal : 0
  const isMinOrderMet = !selectedCity || diff <= 0

  useEffect(() => {
    fetch('/api/cities')
      .then((res) => res.json())
      .then((data) => setCities(data.cities ?? []))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false))
  }, [])

  function submit(values: AddressInput) {
    if (!selectedCity) return
    onSubmit(values, selectedCity)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Full Name</label>
        <input {...register('full_name')} className="input-base" placeholder="Ramesh Patel" />
        {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Mobile Number</label>
        <div className="flex">
          <span className="flex items-center rounded-l-lg border border-r-0 border-cream-dark bg-gold/20 px-3 text-sm font-semibold text-maroon">
            +91
          </span>
          <input
            {...register('phone')}
            inputMode="numeric"
            maxLength={10}
            className="input-base rounded-l-none"
            placeholder="9876543210"
          />
        </div>
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Flat / House / Building
        </label>
        <input {...register('address_line')} className="input-base" placeholder="B-12, Shreeji Apartments" />
        {errors.address_line && (
          <p className="mt-1 text-xs text-red-600">{errors.address_line.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Area / Street / Landmark
        </label>
        <input {...register('area')} className="input-base" placeholder="Near Station Road" />
        {errors.area && <p className="mt-1 text-xs text-red-600">{errors.area.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">City</label>
        <select {...register('city_id')} className="input-base" disabled={loadingCities}>
          <option value="">
            {loadingCities ? 'Loading cities…' : 'Select delivery city'}
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        {errors.city_id && <p className="mt-1 text-xs text-red-600">{errors.city_id.message}</p>}

        {selectedCity && isMinOrderMet && (
          <div className="mt-2 rounded-lg border border-gold bg-amber-50 p-2 text-xs text-amber-800">
            🚚 Delivery to {selectedCity.name} — ₹{selectedCity.delivery_charge} · Min order ₹
            {selectedCity.min_order_value}
          </div>
        )}
        {selectedCity && !isMinOrderMet && (
          <div className="mt-2 rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-700">
            ⚠ Minimum order for {selectedCity.name} is ₹{selectedCity.min_order_value}. Add ₹
            {diff.toFixed(0)} more.
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Pincode</label>
        <input
          {...register('pincode')}
          inputMode="numeric"
          maxLength={6}
          className="input-base"
          placeholder="388001"
        />
        {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode.message}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" {...register('is_default')} className="accent-maroon" />
        Save as default address
      </label>

      <button
        type="submit"
        disabled={isSubmitting || !isMinOrderMet}
        className="btn-primary w-full justify-center disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
