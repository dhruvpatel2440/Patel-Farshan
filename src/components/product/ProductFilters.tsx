'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'newest', label: 'Newest' },
]

interface ProductFiltersProps {
  categories: Category[]
}

function FilterContent({ categories }: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get('category') ?? ''
  const search = searchParams.get('search') ?? ''
  const inStock = searchParams.get('instock') === 'true'
  const sort = searchParams.get('sort') ?? 'popular'

  const [searchValue, setSearchValue] = useState(search)

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/products?${params.toString()}`)
  }

  function clearAll() {
    router.push('/products')
  }

  const hasActiveFilters = Boolean(activeCategory || search || inStock || sort !== 'popular')

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && updateParam('search', searchValue || null)}
          onBlur={() => updateParam('search', searchValue || null)}
          placeholder="Search farsan, sweets…"
          className="input-base pl-9"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Category
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParam('category', null)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              !activeCategory
                ? 'border-maroon bg-maroon text-white'
                : 'border-maroon text-maroon hover:bg-maroon/5'
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParam('category', cat.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                activeCategory === cat.id
                  ? 'border-maroon bg-maroon text-white'
                  : 'border-maroon text-maroon hover:bg-maroon/5'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between text-sm font-medium text-stone-700">
        In Stock Only
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => updateParam('instock', e.target.checked ? 'true' : null)}
          className="h-4 w-4 accent-maroon"
        />
      </label>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Sort</p>
        <select
          value={sort}
          onChange={(e) => updateParam('sort', e.target.value === 'popular' ? null : e.target.value)}
          className="input-base"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-dark"
        >
          <X className="h-3.5 w-3.5" /> Clear All
        </button>
      )}
    </div>
  )
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const searchParams = useSearchParams()
  const activeCount = useMemo(() => {
    let n = 0
    if (searchParams.get('category')) n++
    if (searchParams.get('search')) n++
    if (searchParams.get('instock')) n++
    if (searchParams.get('sort')) n++
    return n
  }, [searchParams])

  return (
    <>
      {/* Mobile trigger */}
      <div className="mb-4 md:hidden">
        <Sheet>
          <SheetTrigger className="relative flex items-center gap-2 rounded-lg border border-maroon bg-white px-4 py-2 text-sm font-semibold text-maroon">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-maroon">
                {activeCount}
              </span>
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto bg-cream">
            <SheetHeader>
              <SheetTitle className="font-serif text-maroon">Filters</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <FilterContent categories={categories} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="card-base sticky top-24 p-4">
          <FilterContent categories={categories} />
        </div>
      </aside>
    </>
  )
}
