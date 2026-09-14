import { format } from 'date-fns'
import { SHOP_NAME, SHOP_WHATSAPP, SITE_URL } from '@/lib/constants'
import type { Order, OrderItem } from '@/types'

function formatItem(item: OrderItem, index: number): string {
  // Both names: the shop reads Gujarati, but the English one removes any doubt
  // about which product it is.
  const name = item.product_name_gujarati
    ? `${item.product_name_gujarati} (${item.product_name})`
    : item.product_name
  const unit = item.unit_label ? ` ${item.unit_label}` : ''
  return `${index + 1}. ${name}${unit} — ${item.quantity} × ₹${item.price_at_purchase} = ₹${item.line_total}`
}

function paymentLabel(order: Order): string {
  if (order.payment_mode === 'cod') return 'Cash on delivery'
  return order.payment_status === 'paid' ? 'UPI — paid' : 'UPI — verification pending'
}

/**
 * The order, written out for the shop's WhatsApp — the customer only presses
 * Send. Asterisks are WhatsApp's own bold markers.
 */
export function buildOrderWhatsAppMessage(order: Order): string {
  const address = order.address_snapshot
  const items = order.items ?? []

  const lines = [
    `Hello ${SHOP_NAME}, here are my order details 🙏`,
    ``,
    `*Order No:* #${order.order_number}`,
    `*Name:* ${address.full_name}`,
    `*Mobile:* +91 ${address.phone}`,
    ``,
    `*Items*`,
    ...items.map(formatItem),
    ``,
    `*Subtotal:* ₹${order.subtotal}`,
    `*Delivery:* ₹${order.delivery_charge}`,
    `*Total:* ₹${order.total}`,
    ``,
    `*Payment:* ${paymentLabel(order)}`,
  ]

  if (order.utr_number) lines.push(`*UTR:* ${order.utr_number}`)
  if (address.city?.name) lines.push(`*Bus pickup at:* ${address.city.name}`)
  if (address.city?.estimated_delivery_time) {
    lines.push(`*Expected:* ${address.city.estimated_delivery_time}`)
  }
  if (order.delivery_instructions) lines.push(`*Note:* ${order.delivery_instructions}`)

  lines.push(
    ``,
    `*Placed:* ${format(new Date(order.placed_at), 'd MMM yyyy, h:mm a')}`,
    `${SITE_URL}/orders/${order.id}`
  )

  return lines.join('\n')
}

/** Null when the shop has no WhatsApp number configured, so callers can hide the button. */
export function orderWhatsAppUrl(order: Order): string | null {
  if (!SHOP_WHATSAPP) return null
  return `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(buildOrderWhatsAppMessage(order))}`
}
