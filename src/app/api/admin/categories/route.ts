import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATALOG_TAG } from '@/lib/data'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin.from('categories').select('*').order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ categories: data })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('categories').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ category: data })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, ...body } = await request.json()
  if (!id) return NextResponse.json({ error: 'Category id is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('categories').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ category: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Category id is required.' }, { status: 400 })

  const admin = createAdminClient()

  const { count } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .eq('is_deleted', false)

  if (count && count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete — ${count} product${count > 1 ? 's are' : ' is'} in this category. Move or delete those products first, or deactivate this category instead.`,
      },
      { status: 409 }
    )
  }

  const { error } = await admin.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ ok: true })
}
