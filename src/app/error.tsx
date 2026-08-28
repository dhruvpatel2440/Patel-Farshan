'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="text-center">
        <div className="mb-4 text-6xl">😔</div>
        <h1 className="mb-2 font-serif text-2xl font-bold text-maroon">Something went wrong</h1>
        <p className="mb-6 text-stone-500">We&apos;re sorry. Please try again.</p>
        <button onClick={reset} className="btn-primary">
          Try Again
        </button>
      </div>
    </div>
  )
}
