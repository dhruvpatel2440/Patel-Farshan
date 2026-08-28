import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const productId = formData.get('productId') as string | null
  const bucket = (formData.get('bucket') as string | null) || 'product-images'

  if (!file || !productId) {
    return NextResponse.json({ error: 'A file and an id are required.' }, { status: 400 })
  }
  if (bucket !== 'product-images' && bucket !== 'category-images') {
    return NextResponse.json({ error: 'Unknown upload target.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image must be 2MB or smaller.' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${productId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
