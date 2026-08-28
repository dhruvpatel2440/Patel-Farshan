import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProductById, getRelatedProducts } from '@/lib/data'
import { ProductDetailClient } from '@/components/product/ProductDetailClient'

export const dynamic = 'force-dynamic'

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) return { title: 'Product not found' }
  return {
    title: product.name,
    description: product.description ?? `${product.name} — fresh from Patel Farsan.`,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) notFound()

  const related = product.category_id
    ? await getRelatedProducts(product.category_id, product.id)
    : []

  return <ProductDetailClient product={product} related={related} />
}
