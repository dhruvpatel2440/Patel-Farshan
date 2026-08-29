import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/publicClient'
import type { Category, City, Feedback, Product } from '@/types'

/**
 * All fetchers fail soft (return []) instead of throwing — the site must
 * render its empty states rather than crash when Supabase isn't configured
 * yet or a table has no rows.
 *
 * Catalog data is the same for every visitor and changes only when an admin
 * edits it, so each read is cached and tagged. Admin write routes call
 * revalidateTag(CATALOG_TAG), which makes edits show up immediately instead of
 * re-querying Supabase (~300-1000ms) on every single page view.
 */

export const CATALOG_TAG = 'catalog'
export const FEEDBACK_TAG = 'feedback'

const cacheOptions = { revalidate: 300, tags: [CATALOG_TAG] }

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    try {
      const supabase = createPublicClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      if (error) throw error
      return data ?? []
    } catch {
      return []
    }
  },
  ['categories'],
  cacheOptions
)

export const getFeaturedProducts = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    try {
      const supabase = createPublicClient()
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_featured', true)
        .eq('is_available', true)
        .eq('is_deleted', false)
        .limit(limit)
      if (error) throw error
      return data ?? []
    } catch {
      return []
    }
  },
  ['featured-products'],
  cacheOptions
)

export const getActiveCities = unstable_cache(
  async (): Promise<City[]> => {
    try {
      const supabase = createPublicClient()
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    } catch {
      return []
    }
  },
  ['active-cities'],
  cacheOptions
)

export const getProducts = unstable_cache(
  async (params?: {
    categoryId?: string
    search?: string
    inStock?: boolean
    sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest'
  }): Promise<Product[]> => {
    try {
      const supabase = createPublicClient()
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .eq('is_deleted', false)

      if (params?.categoryId) query = query.eq('category_id', params.categoryId)
      if (params?.search) query = query.ilike('name', `%${params.search}%`)
      if (params?.inStock) query = query.gt('stock_qty', 0)

      switch (params?.sort) {
        case 'price_asc':
          query = query.order('price', { ascending: true })
          break
        case 'price_desc':
          query = query.order('price', { ascending: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        default:
          query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    } catch {
      return []
    }
  },
  ['products'],
  cacheOptions
)

export const getProductById = unstable_cache(
  async (id: string): Promise<Product | null> => {
    try {
      const supabase = createPublicClient()
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('id', id)
        .eq('is_deleted', false)
        .single()
      if (error) throw error
      return data
    } catch {
      return null
    }
  },
  ['product-by-id'],
  cacheOptions
)

export const getRelatedProducts = unstable_cache(
  async (categoryId: string, excludeId: string, limit = 4): Promise<Product[]> => {
    try {
      const supabase = createPublicClient()
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_available', true)
        .eq('is_deleted', false)
        .neq('id', excludeId)
        .limit(limit)
      if (error) throw error
      return data ?? []
    } catch {
      return []
    }
  },
  ['related-products'],
  cacheOptions
)

export const getApprovedFeedback = unstable_cache(
  async (limit = 20): Promise<Feedback[]> => {
    try {
      const supabase = createPublicClient()
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    } catch {
      return []
    }
  },
  ['approved-feedback'],
  { revalidate: 300, tags: [FEEDBACK_TAG] }
)
