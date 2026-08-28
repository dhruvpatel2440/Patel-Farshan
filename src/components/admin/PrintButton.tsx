'use client'

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-outline mt-4 print:hidden">
      Print Invoice
    </button>
  )
}
