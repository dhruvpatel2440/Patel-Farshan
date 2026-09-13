import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAudit, setAuditTarget } from '@/lib/audit'
import { REELS_TAG } from '@/lib/data'
import { REEL_BUCKET } from '@/lib/reels'

const TITLE_MAX = 80
const CAPTION_MAX = 200

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('shop_reels')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ reels: data })
}

export const POST = withAudit('reel.create', async (request: Request) => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const title = String(body.title ?? '').trim()

  if (!title) return NextResponse.json({ error: 'Give the reel a title.' }, { status: 400 })
  if (!body.video_url || !body.video_path) {
    return NextResponse.json({ error: 'Upload a video first.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // New reels go to the end of the strip. Read the current maximum rather
  // than counting rows — deletes would make a count collide with an
  // existing order.
  const { data: last } = await admin
    .from('shop_reels')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await admin
    .from('shop_reels')
    .insert({
      title: title.slice(0, TITLE_MAX),
      caption: String(body.caption ?? '').trim().slice(0, CAPTION_MAX) || null,
      video_url: body.video_url,
      video_path: body.video_path,
      poster_url: body.poster_url ?? null,
      poster_path: body.poster_path ?? null,
      display_order: (last?.display_order ?? 0) + 1,
      is_active: body.is_active ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  setAuditTarget({ entityType: 'shop_reel', entityId: data.id, summary: `Added reel "${data.title}"` })
  revalidateTag(REELS_TAG, { expire: 0 })
  return NextResponse.json({ reel: data })
})

export const PUT = withAudit('reel.update', async (request: Request) => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, ...body } = await request.json()
  if (!id) return NextResponse.json({ error: 'Reel id is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing, error: readError } = await admin
    .from('shop_reels')
    .select('*')
    .eq('id', id)
    .single()

  if (readError || !existing) {
    return NextResponse.json({ error: 'That reel no longer exists.' }, { status: 404 })
  }

  // Whitelisted so a stray field in the request body can't reach a column the
  // admin UI never meant to expose.
  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (!title) return NextResponse.json({ error: 'Give the reel a title.' }, { status: 400 })
    patch.title = title.slice(0, TITLE_MAX)
  }
  if (typeof body.caption === 'string') patch.caption = body.caption.trim().slice(0, CAPTION_MAX) || null
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (typeof body.display_order === 'number') patch.display_order = body.display_order
  if (body.video_url && body.video_path) {
    patch.video_url = body.video_url
    patch.video_path = body.video_path
  }
  if (body.poster_url && body.poster_path) {
    patch.poster_url = body.poster_url
    patch.poster_path = body.poster_path
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { data, error } = await admin.from('shop_reels').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Replaced files are orphaned the moment the row stops pointing at them.
  const replaced = [
    patch.video_path && existing.video_path !== patch.video_path ? existing.video_path : null,
    patch.poster_path && existing.poster_path !== patch.poster_path ? existing.poster_path : null,
  ].filter((p): p is string => Boolean(p))
  if (replaced.length > 0) await admin.storage.from(REEL_BUCKET).remove(replaced)

  setAuditTarget({
    entityType: 'shop_reel',
    entityId: id,
    summary: `Updated reel "${data.title}"`,
    metadata: { fields: Object.keys(patch) },
  })
  revalidateTag(REELS_TAG, { expire: 0 })
  return NextResponse.json({ reel: data })
})

export const DELETE = withAudit('reel.delete', async (request: Request) => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Reel id is required.' }, { status: 400 })
  setAuditTarget({ entityType: 'shop_reel', entityId: id })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('shop_reels')
    .select('title, video_path, poster_path')
    .eq('id', id)
    .single()

  const { error } = await admin.from('shop_reels').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Files go after the row, not before: a failed delete then leaves a reel
  // that still plays, rather than a row pointing at a video that is gone.
  if (existing) {
    const paths = [existing.video_path, existing.poster_path].filter((p): p is string => Boolean(p))
    if (paths.length > 0) await admin.storage.from(REEL_BUCKET).remove(paths)
  }

  setAuditTarget({ summary: `Deleted reel "${existing?.title ?? id}"` })
  revalidateTag(REELS_TAG, { expire: 0 })
  return NextResponse.json({ ok: true })
})
