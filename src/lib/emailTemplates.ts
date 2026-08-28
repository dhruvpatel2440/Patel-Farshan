import { SITE_URL } from '@/lib/constants'

interface OrderConfirmationArgs {
  orderNumber: string
  customerName: string
  items: { name: string; quantity: number; lineTotal: number }[]
  subtotal: number
  deliveryCharge: number
  total: number
  paymentMode: 'upi' | 'cod'
  orderId: string
}

/** Plain-text fallback — required by every mail client that can't render HTML. */
export function orderConfirmationText(o: OrderConfirmationArgs): string {
  const lines = o.items.map((i) => `  ${i.name} x${i.quantity} — ₹${i.lineTotal}`).join('\n')
  return [
    `Thank you for your order, ${o.customerName}!`,
    ``,
    `Order #${o.orderNumber}`,
    ``,
    lines,
    ``,
    `Subtotal: ₹${o.subtotal}`,
    `Delivery: ₹${o.deliveryCharge}`,
    `Total: ₹${o.total}`,
    ``,
    `Payment: ${o.paymentMode === 'cod' ? 'Cash on delivery' : 'UPI — verification pending'}`,
    ``,
    `Track your order: ${SITE_URL}/orders/${o.orderId}`,
    ``,
    `— Patel Farsan`,
  ].join('\n')
}

export function orderConfirmationHtml(o: OrderConfirmationArgs): string {
  const rows = o.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;color:#3d110e;font-size:14px;">${escapeHtml(i.name)} &times; ${i.quantity}</td>
        <td style="padding:8px 0;text-align:right;color:#5c1a15;font-weight:600;font-size:14px;">₹${i.lineTotal}</td>
      </tr>`
    )
    .join('')

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fdf1dc;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf1dc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border-top:4px solid #5c1a15;">
            <tr>
              <td style="background:#5c1a15;padding:20px 28px;text-align:center;">
                <span style="color:#fdf1dc;font-size:20px;font-weight:bold;">Patel Farsan</span>
                <br />
                <span style="color:#c99a2e;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Since 1985</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 4px;color:#5c1a15;font-size:18px;font-weight:bold;">
                  Thank you for ordering, ${escapeHtml(o.customerName)}!
                </p>
                <p style="margin:0 0 20px;color:#78716c;font-size:13px;">
                  Order <strong style="color:#5c1a15;">#${escapeHtml(o.orderNumber)}</strong>
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0e4cc;border-bottom:1px solid #f0e4cc;padding:8px 0;">
                  ${rows}
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:13px;color:#78716c;">
                  <tr>
                    <td>Subtotal</td>
                    <td align="right">₹${o.subtotal}</td>
                  </tr>
                  <tr>
                    <td>Delivery</td>
                    <td align="right">₹${o.deliveryCharge}</td>
                  </tr>
                  <tr>
                    <td style="padding-top:6px;border-top:1px solid #f0e4cc;color:#5c1a15;font-weight:bold;font-size:15px;">Total</td>
                    <td align="right" style="padding-top:6px;border-top:1px solid #f0e4cc;color:#5c1a15;font-weight:bold;font-size:15px;">₹${o.total}</td>
                  </tr>
                </table>

                <p style="margin:20px 0 0;padding:10px 14px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:13px;">
                  ${o.paymentMode === 'cod' ? '💵 Pay on delivery' : '⏳ UPI payment verification pending'}
                </p>

                <a href="${SITE_URL}/orders/${o.orderId}"
                   style="display:block;margin-top:24px;padding:12px;background:#5c1a15;color:#fdf1dc;text-align:center;
                          text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
                  Track My Order
                </a>
              </td>
            </tr>
          </table>
          <p style="margin-top:16px;color:#a8a29e;font-size:11px;">Patel Farsan &middot; Authentic Gujarati farsan since 1985</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
