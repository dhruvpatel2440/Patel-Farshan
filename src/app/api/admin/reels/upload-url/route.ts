import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  REEL_BUCKET,
  REEL_POSTER_MAX_SIZE,
  REEL_POSTER_TYPE_MESSAGE,
  REEL_POSTER_TYPES,
  REEL_VIDEO_MAX_SIZE,
  REEL_VIDEO_TYPE_MESSAGE,
  REEL_VIDEO_TYPES,
} from '@/lib/reels'

/**
 * Mints a short-lived signed URL the browser uploads the file to directly.
 *
 * Reels routinely run tens of megabytes, and a serverless request body caps
 * out far below that (4.5MB on Vercel), so /api/upload's read-it-into-memory
 * approach can't carry them. The tradeoff is that the bytes never pass
 * through us, so we can't magic-byte them the way we do product images —
 * the bucket's own size and MIME limits are what actually hold, and only an
 * authenticated admin can get a URL in the first place.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { kind, contentType, size } = await request.json()

  if (kind !== 'video' && kind !== 'poster') {
    return NextResponse.json({ error: 'Unknown upload target.' }, { status: 400 })
  }

  const allowed: Record<string, string> = kind === 'video' ? REEL_VIDEO_TYPES : REEL_POSTER_TYPES
  const maxSize = kind === 'video' ? REEL_VIDEO_MAX_SIZE : REEL_POSTER_MAX_SIZE
  const declaredType = String(contentType ?? '').split(';')[0].trim().toLowerCase()

  if (!(declaredType in allowed)) {
    return NextResponse.json(
      { error: kind === 'video' ? REEL_VIDEO_TYPE_MESSAGE : REEL_POSTER_TYPE_MESSAGE },
      { status: 400 }
    )
  }
  if (typeof size !== 'number' || size <= 0 || size > maxSize) {
    return NextResponse.json(
      {
        error:
          kind === 'video'
            ? 'Video must be 50MB or smaller.'
            : 'Cover image must be 2MB or smaller.',
      },
      { status: 400 }
    )
  }

  // Extension comes from the checked type, and the name from a fresh UUID, so
  // the uploaded filename never reaches the bucket.
  const path = `${kind}/${randomUUID()}.${allowed[declaredType]}`

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(REEL_BUCKET).createSignedUploadUrl(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: publicUrl } = admin.storage.from(REEL_BUCKET).getPublicUrl(path)

  return NextResponse.json({
    path,
    token: data.token,
    publicUrl: publicUrl.publicUrl,
  })
}
