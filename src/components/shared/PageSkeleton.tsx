/**
 * Shown by the route-group `loading.tsx` boundaries while a page's server
 * component resolves. Without it, clicking a link leaves the old page on
 * screen with no feedback until the response lands; with it, navigation
 * paints immediately and the real content streams in behind.
 */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 md:px-6 md:py-10">
      <div className="h-3 w-28 rounded bg-maroon/10" />
      <div className="mt-4 h-8 w-56 rounded bg-maroon/15" />
      <div className="mt-3 h-px w-full bg-gold/20" />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-cream-dark bg-white">
            <div className="aspect-square w-full bg-cream" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 rounded bg-maroon/10" />
              <div className="h-3 w-1/2 rounded bg-maroon/10" />
              <div className="h-8 w-full rounded-lg bg-cream" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
