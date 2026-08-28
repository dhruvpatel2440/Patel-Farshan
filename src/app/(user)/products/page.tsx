import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { OrnamentalDivider } from '@/components/shared/OrnamentalDivider'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ProductFilters } from '@/components/product/ProductFilters'
import { getCategories, getProducts } from '@/lib/data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Our Menu',
  description:
    'Browse our fresh Gujarati farsan — ganthiya, jalebi, khakhra, chakli and more. Delivered daily.',
}

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string
    search?: string
    sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest'
    instock?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({
      categoryId: params.category,
      search: params.search,
      sort: params.sort,
      inStock: params.instock === 'true',
    }),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <nav className="mb-4 flex items-center gap-1 text-xs text-stone-500">
        <Link href="/" className="hover:text-maroon">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-maroon">Menu</span>
      </nav>

      <div className="flex items-baseline justify-between">
        <h1 className="section-title text-2xl md:text-3xl">Our Menu</h1>
        <span className="text-sm text-stone-500">{products.length} items</span>
      </div>
      <OrnamentalDivider size="sm" className="!my-3 md:hidden" />
      <OrnamentalDivider className="hidden md:flex" />

      <div className="flex flex-col gap-6 md:flex-row">
        <ProductFilters categories={categories} />
        <div className="flex-1">
          <ProductGrid products={products} emptyMessage="Try a different category or search term." />
        </div>
      </div>
    </div>
  )
}
