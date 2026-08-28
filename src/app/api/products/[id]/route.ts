import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = createAdminClient()

    const { data: product, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: related } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', product.category_id)
      .eq('is_available', true)
      .eq('is_deleted', false)
      .neq('id', id)
      .limit(4)

    return NextResponse.json({ product, related: related ?? [] })
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
}
