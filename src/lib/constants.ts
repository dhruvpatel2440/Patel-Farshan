export const ORDER_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting Payment',
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  awaiting_payment: 'amber',
  placed: 'grey',
  confirmed: 'blue',
  packed: 'amber',
  out_for_delivery: 'orange',
  delivered: 'green',
  cancelled: 'red',
}

export const ADMIN_STATUS_FLOW = [
  'placed',
  'confirmed',
  'packed',
  'out_for_delivery',
  'delivered',
] as const

export const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || 'Patel Farsan'
export const SHOP_NAME_GUJARATI = 'પટેલ ફરસાણ'
export const SHOP_PHONE = process.env.NEXT_PUBLIC_SHOP_PHONE || ''
export const SHOP_WHATSAPP = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || ''
export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || ''
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
