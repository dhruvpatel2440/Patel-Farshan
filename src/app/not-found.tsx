import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="text-center">
        <div className="mb-4 text-6xl">🍽</div>
        <h1 className="mb-2 font-serif text-2xl font-bold text-maroon">Page not found</h1>
        <p className="mb-6 text-stone-500">This page doesn&apos;t exist or was moved.</p>
        <Link href="/" className="btn-primary">
          Go Home
        </Link>
      </div>
    </div>
  )
}
