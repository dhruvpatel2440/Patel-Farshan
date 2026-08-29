import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Address } from '@/types'

interface AddressCardProps {
  address: Address
  isSelected: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function AddressCard({ address, isSelected, onSelect, onEdit, onDelete }: AddressCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-full rounded-xl border-[1.5px] p-4 text-left transition-colors',
        isSelected ? 'border-maroon bg-white' : 'border-cream-dark bg-cream'
      )}
    >
      {isSelected && (
        <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-maroon" />
      )}
      {address.is_default && (
        <span className="mb-1 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-maroon">
          Default
        </span>
      )}
      <p className="font-semibold text-maroon">{address.full_name}</p>
      <p className="text-sm text-stone-600">+91 {address.phone}</p>
      <p className="mt-1 text-sm text-stone-600">Bus pickup — {address.city?.name}</p>

      {(onEdit || onDelete) && (
        <div className="mt-2 flex gap-4">
          {onEdit && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark"
            >
              <Pencil className="h-3 w-3" /> Edit
            </span>
          )}
          {onDelete && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </span>
          )}
        </div>
      )}
    </button>
  )
}
