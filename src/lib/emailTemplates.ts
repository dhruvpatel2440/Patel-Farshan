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

export function verificationCodeText(name: string, code: string, minutes: number): string {
  return [
    `Hi ${name},`,
    ``,
    `Your Patel Farsan verification code is: ${code}`,
    ``,
    `It expires in ${minutes} minutes.`,
    `If you didn't try to create an account, you can ignore this email.`,
    ``,
    `— Patel Farsan`,
  ].join('\n')
}

export function verificationCodeHtml(name: string, code: string, minutes: number): string {
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fdf1dc;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf1dc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border-top:4px solid #5c1a15;">
            <tr>
              <td style="background:#5c1a15;padding:20px 28px;text-align:center;">
                <span style="color:#fdf1dc;font-size:20px;font-weight:bold;">Patel Farsan</span>
                <br />
                <span style="color:#c99a2e;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Since 1985</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;text-align:center;">
                <p style="margin:0 0 6px;color:#5c1a15;font-size:17px;font-weight:bold;">
                  Hi ${escapeHtml(name)}, confirm your email
                </p>
                <p style="margin:0 0 22px;color:#78716c;font-size:13px;">
                  Enter this code to finish creating your account.
                </p>

                <div style="display:inline-block;padding:14px 28px;background:#fdf1dc;border:2px dashed #c99a2e;border-radius:12px;">
                  <span style="color:#5c1a15;font-size:32px;font-weight:bold;letter-spacing:10px;font-family:'Courier New',monospace;">${escapeHtml(code)}</span>
                </div>

                <p style="margin:22px 0 0;color:#92400e;font-size:12px;">
                  This code expires in ${minutes} minutes.
                </p>
                <p style="margin:14px 0 0;color:#a8a29e;font-size:11px;">
                  Didn't try to sign up? You can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function passwordResetCodeText(name: string, code: string, minutes: number): string {
  return [
    `Hi ${name},`,
    ``,
    `Your Patel Farsan password reset code is: ${code}`,
    ``,
    `It expires in ${minutes} minutes.`,
    `If you didn't ask to reset your password, ignore this email — your password stays unchanged.`,
    ``,
    `— Patel Farsan`,
  ].join('\n')
}

export function passwordResetCodeHtml(name: string, code: string, minutes: number): string {
  return shell(`
    <p style="margin:0 0 6px;color:#5c1a15;font-size:17px;font-weight:bold;text-align:center;">
      Hi ${escapeHtml(name)}, reset your password
    </p>
    <p style="margin:0 0 22px;color:#78716c;font-size:13px;text-align:center;">
      Enter this code to choose a new password.
    </p>
    <div style="text-align:center;">
      <div style="display:inline-block;padding:14px 28px;background:#fdf1dc;border:2px dashed #c99a2e;border-radius:12px;">
        <span style="color:#5c1a15;font-size:32px;font-weight:bold;letter-spacing:10px;font-family:'Courier New',monospace;">${escapeHtml(code)}</span>
      </div>
    </div>
    <p style="margin:22px 0 0;color:#92400e;font-size:12px;text-align:center;">This code expires in ${minutes} minutes.</p>
    <p style="margin:14px 0 0;color:#a8a29e;font-size:11px;text-align:center;">
      Didn't request this? Ignore this email — your password stays unchanged.
    </p>`)
}

export function adminLoginCodeText(name: string, code: string, minutes: number): string {
  return [
    `Hi ${name},`,
    ``,
    `Your Patel Farsan admin panel security code is: ${code}`,
    ``,
    `It expires in ${minutes} minutes.`,
    ``,
    `If this wasn't you, someone has your admin password — change it immediately.`,
    ``,
    `— Patel Farsan`,
  ].join('\n')
}

export function adminLoginCodeHtml(name: string, code: string, minutes: number): string {
  return shell(`
    <p style="margin:0 0 6px;color:#5c1a15;font-size:17px;font-weight:bold;text-align:center;">
      🔐 Admin panel access
    </p>
    <p style="margin:0 0 22px;color:#78716c;font-size:13px;text-align:center;">
      Hi ${escapeHtml(name)}, enter this code to unlock the admin panel.
    </p>
    <div style="text-align:center;">
      <div style="display:inline-block;padding:14px 28px;background:#fdf1dc;border:2px dashed #c99a2e;border-radius:12px;">
        <span style="color:#5c1a15;font-size:32px;font-weight:bold;letter-spacing:10px;font-family:'Courier New',monospace;">${escapeHtml(code)}</span>
      </div>
    </div>
    <p style="margin:22px 0 0;color:#92400e;font-size:12px;text-align:center;">This code expires in ${minutes} minutes.</p>
    <div style="margin-top:18px;padding:12px 14px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;">
      <p style="margin:0;color:#991b1b;font-size:12px;">
        If this wasn't you, someone has your admin password — change it immediately.
      </p>
    </div>`)
}

interface StatusEmailArgs {
  orderNumber: string
  customerName: string
  orderId: string
}

export function outForDeliveryText(o: StatusEmailArgs): string {
  return [
    `Hi ${o.customerName},`,
    ``,
    `Good news — your order #${o.orderNumber} is out for delivery and will reach you shortly.`,
    ``,
    `Track it here: ${SITE_URL}/orders/${o.orderId}`,
    ``,
    `— Patel Farsan`,
  ].join('\n')
}

export function outForDeliveryHtml(o: StatusEmailArgs): string {
  return shell(`
    <p style="margin:0 0 6px;color:#5c1a15;font-size:18px;font-weight:bold;">
      🛵 Your farsan is on the way!
    </p>
    <p style="margin:0 0 18px;color:#78716c;font-size:13px;">
      Hi ${escapeHtml(o.customerName)}, order
      <strong style="color:#5c1a15;">#${escapeHtml(o.orderNumber)}</strong> is out for delivery
      and will reach you shortly.
    </p>
    <a href="${SITE_URL}/orders/${o.orderId}"
       style="display:block;padding:12px;background:#5c1a15;color:#fdf1dc;text-align:center;
              text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
      Track My Order
    </a>`)
}

export function orderCancelledText(o: StatusEmailArgs & { reason: string; refundDue: boolean }): string {
  return [
    `Hi ${o.customerName},`,
    ``,
    `Your order #${o.orderNumber} has been cancelled.`,
    ``,
    `Reason: ${o.reason}`,
    o.refundDue ? `\nYou paid for this order — our team will process your refund shortly.` : '',
    ``,
    `Questions? Reply to this email or call us.`,
    ``,
    `— Patel Farsan`,
  ].join('\n')
}

export function orderCancelledHtml(o: StatusEmailArgs & { reason: string; refundDue: boolean }): string {
  return shell(`
    <p style="margin:0 0 6px;color:#5c1a15;font-size:18px;font-weight:bold;">
      Order #${escapeHtml(o.orderNumber)} cancelled
    </p>
    <p style="margin:0 0 16px;color:#78716c;font-size:13px;">
      Hi ${escapeHtml(o.customerName)}, we're sorry — this order has been cancelled.
    </p>
    <div style="padding:12px 14px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;">
      <p style="margin:0;color:#991b1b;font-size:13px;"><strong>Reason:</strong> ${escapeHtml(o.reason)}</p>
    </div>
    ${
      o.refundDue
        ? `<div style="margin-top:12px;padding:12px 14px;background:#fef3c7;border-radius:6px;">
             <p style="margin:0;color:#92400e;font-size:13px;">
               You already paid for this order — our team will process your refund shortly.
             </p>
           </div>`
        : ''
    }
    <a href="${SITE_URL}/products"
       style="display:block;margin-top:20px;padding:12px;background:#5c1a15;color:#fdf1dc;text-align:center;
              text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
      Browse Menu
    </a>`)
}

interface NewOrderAdminArgs {
  orderNumber: string
  customerName: string
  customerPhone: string
  items: { name: string; quantity: number; lineTotal: number }[]
  total: number
  paymentMode: 'upi' | 'cod'
  address: string
  orderId: string
}

export function newOrderAdminText(o: NewOrderAdminArgs): string {
  const lines = o.items.map((i) => `  ${i.name} x${i.quantity} — ₹${i.lineTotal}`).join('\n')
  return [
    `New order #${o.orderNumber}`,
    ``,
    `Customer: ${o.customerName} (${o.customerPhone})`,
    `Address: ${o.address}`,
    `Payment: ${o.paymentMode === 'cod' ? 'Cash on delivery' : 'UPI — needs verification'}`,
    ``,
    lines,
    ``,
    `Total: ₹${o.total}`,
    ``,
    `Manage: ${SITE_URL}/admin/orders/${o.orderId}`,
  ].join('\n')
}

export function newOrderAdminHtml(o: NewOrderAdminArgs): string {
  const rows = o.items
    .map(
      (i) => `
      <tr>
        <td style="padding:6px 0;color:#3d110e;font-size:13px;">${escapeHtml(i.name)} &times; ${i.quantity}</td>
        <td style="padding:6px 0;text-align:right;color:#5c1a15;font-weight:600;font-size:13px;">₹${i.lineTotal}</td>
      </tr>`
    )
    .join('')

  return shell(`
    <p style="margin:0 0 4px;color:#5c1a15;font-size:18px;font-weight:bold;">
      🛎️ New order #${escapeHtml(o.orderNumber)}
    </p>
    <p style="margin:0 0 16px;color:#78716c;font-size:13px;">
      ${escapeHtml(o.customerName)} &middot; ${escapeHtml(o.customerPhone)}
    </p>

    <div style="padding:12px 14px;background:#fdf1dc;border-radius:8px;font-size:13px;color:#3d110e;">
      <strong>Deliver to:</strong> ${escapeHtml(o.address)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid #f0e4cc;border-bottom:1px solid #f0e4cc;">
      ${rows}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
      <tr>
        <td style="color:#5c1a15;font-weight:bold;font-size:15px;">Total</td>
        <td align="right" style="color:#5c1a15;font-weight:bold;font-size:15px;">₹${o.total}</td>
      </tr>
    </table>

    <p style="margin:14px 0 0;padding:10px 14px;background:${o.paymentMode === 'cod' ? '#ecfdf5' : '#fef3c7'};border-radius:8px;
              color:${o.paymentMode === 'cod' ? '#065f46' : '#92400e'};font-size:13px;">
      ${o.paymentMode === 'cod' ? '💵 Cash on delivery' : '⏳ UPI — payment needs verification'}
    </p>

    <a href="${SITE_URL}/admin/orders/${o.orderId}"
       style="display:block;margin-top:20px;padding:12px;background:#5c1a15;color:#fdf1dc;text-align:center;
              text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
      Open in Admin
    </a>`)
}

/** Shared branded wrapper so every email looks like the same shop. */
function shell(inner: string): string {
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fdf1dc;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf1dc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="460" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border-top:4px solid #5c1a15;">
            <tr>
              <td style="background:#5c1a15;padding:20px 28px;text-align:center;">
                <span style="color:#fdf1dc;font-size:20px;font-weight:bold;">Patel Farsan</span>
                <br />
                <span style="color:#c99a2e;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Since 1985</span>
              </td>
            </tr>
            <tr><td style="padding:28px;">${inner}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
