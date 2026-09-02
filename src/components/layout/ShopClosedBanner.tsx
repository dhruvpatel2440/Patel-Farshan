import { AlertTriangle } from 'lucide-react'

export function ShopClosedBanner({ message }: { message?: string | null }) {
  return (
    <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{message?.trim() || "We're currently closed. Please check back later."}</span>
    </div>
  )
}
