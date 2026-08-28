import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATALOG_TAG } from '@/lib/data'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin.from('cities').select('*').order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ cities: data })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('cities').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ city: data })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, ...body } = await request.json()
  if (!id) return NextResponse.json({ error: 'City id is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('cities').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ city: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'City id is required.' }, { status: 400 })

  const admin = createAdminClient()

  const { count } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('address_snapshot->city->>id', id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'This city has existing orders. Deactivate instead of deleting.' },
      { status: 409 }
    )
  }

  const { error } = await admin.from('cities').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ ok: true })
}
