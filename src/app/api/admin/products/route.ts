import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATALOG_TAG } from '@/lib/data'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('products').insert(body).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ product: data })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, ...body } = await request.json()
  if (!id) return NextResponse.json({ error: 'Product id is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('products').update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ product: data })
}
