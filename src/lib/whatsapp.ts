import { format } from 'date-fns'
import { SHOP_NAME, SHOP_WHATSAPP, SITE_URL } from '@/lib/constants'
import type { Order, OrderItem, OrderStatus } from '@/types'

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

/** The part both directions need: what was bought, for how much, going where. */
function orderSummaryLines(order: Order): string[] {
  const address = order.address_snapshot
  const lines = [
    `*Items*`,
    ...(order.items ?? []).map(formatItem),
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

  return lines
}

/**
 * The order, written out for the shop's WhatsApp — the customer only presses
 * Send. Asterisks are WhatsApp's own bold markers.
 */
export function buildOrderWhatsAppMessage(order: Order): string {
  const address = order.address_snapshot

  const lines = [
    `Hello ${SHOP_NAME}, here are my order details 🙏`,
    ``,
    `*Order No:* #${order.order_number}`,
    `*Name:* ${address.full_name}`,
    `*Mobile:* +91 ${address.phone}`,
    ``,
    ...orderSummaryLines(order),
  ]

  if (order.delivery_instructions) lines.push(`*Note:* ${order.delivery_instructions}`)

  lines.push(
    ``,
    `*Placed:* ${format(new Date(order.placed_at), 'd MMM yyyy, h:mm a')}`,
    `${SITE_URL}/orders/${order.id}`
  )

  return lines.join('\n')
}

const STATUS_MESSAGE: Record<OrderStatus, string> = {
  awaiting_payment: `We haven't received your payment yet — please complete it so we can confirm this order.`,
  placed: `We've received your order — thank you!`,
  confirmed: `Your order is confirmed and we've started preparing it.`,
  packed: `Your order is packed and ready to go.`,
  out_for_delivery: `Your order is on its way.`,
  delivered: `Your order has been delivered. Thank you for shopping with us!`,
  cancelled: `Your order has been cancelled.`,
}

/**
 * The same order written the other way round — from the shop to the customer,
 * for the admin to send. It leads with where the order has got to, because
 * that is the reason the shop reaches out at all.
 */
export function buildCustomerWhatsAppMessage(order: Order): string {
  const name = order.address_snapshot.full_name || order.profile?.name || ''

  const lines = [
    `Hi ${name} 🙏`,
    ``,
    STATUS_MESSAGE[order.order_status],
    ``,
    `*Order No:* #${order.order_number}`,
    ``,
    ...orderSummaryLines(order),
  ]

  if (order.order_status === 'cancelled' && order.cancellation_reason) {
    lines.push(`*Reason:* ${order.cancellation_reason}`)
  }

  lines.push(``, `Track your order: ${SITE_URL}/orders/${order.id}`, ``, `— ${SHOP_NAME}`)

  return lines.join('\n')
}

/** Null when the shop has no WhatsApp number configured, so callers can hide the button. */
export function orderWhatsAppUrl(order: Order): string | null {
  if (!SHOP_WHATSAPP) return null
  return `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(buildOrderWhatsAppMessage(order))}`
}

/** Opens the customer's own chat, so the admin writes to them rather than to the shop. */
export function customerWhatsAppUrl(order: Order): string | null {
  const digits = (order.address_snapshot.phone || order.profile?.phone || '').replace(/\D/g, '')
  if (digits.length < 10) return null
  // Numbers are stored as 10 local digits; wa.me will not open without a country code.
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(buildCustomerWhatsAppMessage(order))}`
}
