/**
 * Parses a free-text size label like "250g", "500 g", "1kg", "1.5 KG" into
 * whole grams. Returns 0 when the label doesn't contain a recognizable
 * weight — callers treat 0 as "doesn't count toward the order weight".
 */
export function parseWeightGrams(label: string): number {
  const match = label.match(/([\d.]+)\s*(kg|g)/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  if (!Number.isFinite(value)) return 0
  return Math.round(match[2].toLowerCase() === 'kg' ? value * 1000 : value)
}

/** Formats a kg quantity for display, e.g. 0.5 -> "500g", 1 -> "1kg". */
export function formatWeightKg(kg: number): string {
  if (kg <= 0) return '0g'
  if (kg < 1) return `${Math.round(kg * 1000)}g`
  return `${Math.round(kg * 100) / 100}kg`
}
