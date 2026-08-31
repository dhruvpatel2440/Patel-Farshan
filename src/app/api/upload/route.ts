import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * Raster formats only. SVG is deliberately excluded: it can carry script, and
 * these files are served from a public Supabase bucket on our own origin.
 */
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

type AllowedType = keyof typeof ALLOWED_TYPES

/**
 * The declared Content-Type is attacker-controlled, so the bytes have to agree
 * with it — otherwise a polyglot could be stored under an image type and
 * served back as something else.
 */
function magicBytesMatch(type: AllowedType, buffer: Buffer): boolean {
  switch (type) {
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case 'image/png':
      return (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      )
    case 'image/webp':
      // RIFF <4-byte little-endian size> WEBP
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      )
  }
}

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
  const declaredType = file.type.split(';')[0].trim().toLowerCase()
  if (!(declaredType in ALLOWED_TYPES)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG or WebP images are allowed.' },
      { status: 400 }
    )
  }
  const contentType = declaredType as AllowedType

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!magicBytesMatch(contentType, buffer)) {
    return NextResponse.json({ error: 'That file is not a valid image.' }, { status: 400 })
  }

  const admin = createAdminClient()
  // Extension comes from the verified type, never from the uploaded filename.
  const path = `${productId}.${ALLOWED_TYPES[contentType]}`

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
