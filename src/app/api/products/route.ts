import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const featured = searchParams.get('featured')
  const limit = Number(searchParams.get('limit') ?? 50)
  const offset = Number(searchParams.get('offset') ?? 0)

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('products')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('is_available', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) query = query.eq('category_id', category)
    if (search) query = query.ilike('name', `%${search}%`)
    if (featured === 'true') query = query.eq('is_featured', true)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ products: data ?? [], count: count ?? 0 })
  } catch {
    return NextResponse.json({ products: [], count: 0 })
  }
}
