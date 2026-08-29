import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATALOG_TAG } from '@/lib/data'
import { parseWeightGrams } from '@/lib/weight'
import { withAudit, setAuditTarget } from '@/lib/audit'

type AdminClient = ReturnType<typeof createAdminClient>

interface TierInput {
  id?: string
  unit_label: string
  price: number
  stock_qty: number
}

/** Replaces a product's price tiers with the given list — deletes dropped
 * tiers, updates existing ones by id, inserts new ones. */
async function replaceTiers(admin: AdminClient, productId: string, tiers: TierInput[]) {
  const { data: existing } = await admin
    .from('product_price_tiers')
    .select('id')
    .eq('product_id', productId)

  const keepIds = new Set(tiers.filter((t) => t.id).map((t) => t.id))
  const toDelete = (existing ?? []).map((t) => t.id).filter((id) => !keepIds.has(id))
  if (toDelete.length) {
    await admin.from('product_price_tiers').delete().in('id', toDelete)
  }

  for (const [index, tier] of tiers.entries()) {
    const row = {
      product_id: productId,
      unit_label: tier.unit_label,
      price: tier.price,
      weight_grams: parseWeightGrams(tier.unit_label),
      stock_qty: tier.stock_qty,
      sort_order: index,
    }
    if (tier.id) {
      await admin.from('product_price_tiers').update(row).eq('id', tier.id)
    } else {
      await admin.from('product_price_tiers').insert(row)
    }
  }
}

async function fetchWithTiers(admin: AdminClient, id: string) {
  const { data, error } = await admin
    .from('products')
    .select('*, price_tiers:product_price_tiers(*)')
    .eq('id', id)
    .single()
  return { data, error }
}

export const POST = withAudit('product.create', async (request: Request) => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { tiers, ...body } = await request.json()
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return NextResponse.json({ error: 'At least one price/weight tier is required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: product, error } = await admin
    .from('products')
    .insert({ ...body, price: tiers[0].price, unit: tiers[0].unit_label, stock_qty: tiers[0].stock_qty })
    .select()
    .single()

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? 'Could not create product.' }, { status: 400 })
  }

  await replaceTiers(admin, product.id, tiers)

  const { data: full, error: fetchError } = await fetchWithTiers(admin, product.id)
  if (fetchError || !full) return NextResponse.json({ error: fetchError?.message }, { status: 400 })

  setAuditTarget({
    entityType: 'product',
    entityId: product.id,
    summary: `Created product "${product.name}"`,
    metadata: { tiers: tiers.length },
  })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ product: full })
})

export const PUT = withAudit('product.update', async (request: Request) => {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, tiers, ...body } = await request.json()
  if (!id) return NextResponse.json({ error: 'Product id is required.' }, { status: 400 })

  const admin = createAdminClient()

  if (Object.keys(body).length > 0) {
    const { error } = await admin.from('products').update(body).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (Array.isArray(tiers) && tiers.length > 0) {
    await replaceTiers(admin, id, tiers)
  }

  const { data: full, error: fetchError } = await fetchWithTiers(admin, id)
  if (fetchError || !full) return NextResponse.json({ error: fetchError?.message }, { status: 400 })

  setAuditTarget({
    entityType: 'product',
    entityId: id,
    summary: `Updated product "${full.name}"`,
    metadata: {
      fields: Object.keys(body),
      ...(Array.isArray(tiers) && tiers.length > 0 ? { tiers: tiers.length } : {}),
    },
  })
  revalidateTag(CATALOG_TAG, { expire: 0 })
  return NextResponse.json({ product: full })
})
