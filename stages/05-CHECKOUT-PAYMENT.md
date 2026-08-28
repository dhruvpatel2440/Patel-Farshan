# 05 — Checkout + Payment + Order Success
# Paste this entire file into Claude Code

---

## CONTEXT

Project: Patel Farsan
Stage 5: Checkout flow, UPI QR generation, order creation, success page.

---

## YOUR TASK — Stage 5: Checkout + Payment

### PART A — Address Components

#### 1. AddressForm component
`src/components/checkout/AddressForm.tsx`

A full address form used inside checkout and in account page.

Fields in order:
1. Full Name (text)
2. Mobile Number (10 digits, +91 prefix shown as grey text in input)
3. Flat / House / Building (text)
4. Area / Street / Landmark (text)
5. City (SELECT dropdown — NOT free text)
6. Pincode (6 digits, numeric)
7. "Save as default address" checkbox

City dropdown:
- Fetch from `/api/cities` (active cities only)
- Placeholder: "Select delivery city"
- Below the select: an info strip that appears AFTER city is selected:
  "🚚 Delivery to {cityName} — ₹{charge} · Min order ₹{minOrder}"
  Styled: bg-amber-50 border-gold rounded-lg p-2 text-xs text-amber-800
- If cart subtotal < city.min_order_value: show red strip instead:
  "⚠ Minimum order for {city} is ₹{min}. Add ₹{diff} more."
  And pass an `isMinOrderMet` prop back to parent.

Validation (Zod):
- Name: min 2 chars
- Phone: exactly 10 digits
- Address, Area: min 5 chars
- City: must be selected
- Pincode: exactly 6 digits

#### 2. AddressCard component
`src/components/checkout/AddressCard.tsx`

Selectable card showing a saved address.
Props: address, isSelected, onSelect, onEdit, onDelete.

Design:
- Border 1.5px, rounded-xl
- Selected: border-maroon bg-white, maroon radio dot top-right
- Unselected: border-cream-dark bg-cream
- Shows: Name, Phone, full address, City
- "Default" gold badge if is_default
- Bottom row: [Edit] and [Delete] in gold text

---

### PART B — Checkout Page

#### 3. Checkout page
`src/app/(user)/checkout/page.tsx`

**Guard:** if cart is empty → redirect to /cart.
**Guard:** if not logged in → redirect to /login?next=/checkout.

Single scrollable page with sections. Sticky summary on right (desktop).

**PROGRESS INDICATOR (top):**
Three steps: ① Address → ② Payment → ③ Review
Current section highlighted maroon, done sections gold checkmark.
Steps connected by line (grey, fills maroon as you progress).

**LAYOUT:**
Desktop: main content (flex-1) + sticky sidebar (320px).
Mobile: full width, summary collapses to an accordion.

**SECTION 1 — Delivery Address:**

If user has saved addresses: show list of AddressCard components.
Radio selection. Selected address is used for the order.
"+ Add New Address" dashed card at the end → opens inline form.

If no saved addresses: show AddressForm directly.

After address is selected/filled, show the city info strip.
If min_order not met: disable the payment section and show error.

**SECTION 2 — Payment Method:**

Two large selectable cards, side by side:

Card A — UPI:
- Gradient: slight gold shimmer background
- 📱 icon (large, 32px)
- "Pay via UPI" maroon bold
- "GPay · PhonePe · Paytm · Any UPI app" grey 12px
- Green "Recommended" pill badge

Card B — Cash on Delivery:
- 💵 icon
- "Cash on Delivery" maroon bold
- "Pay when your order arrives" grey
- Amber "Available" pill

Selected card: `border-2 border-maroon` + maroon tick circle top-right.

**SECTION 3 — Review & Place Order:**

Collapsed summary:
"Delivering to: [Name, first line of address, City]" — [Change] gold link
"Payment: [UPI / COD]" — [Change] gold link

Item list (compact):
Each row: image 40px + name (Gujarati) + qty + line total.

Price breakdown:
```
Subtotal          ₹480
Delivery (Anand)   ₹40
─────────────────────
Total             ₹520
```

Delivery instructions textarea (optional).
Placeholder: "e.g. Ring bell twice · Ground floor flat 3"

Big CTA button:
- COD: [Place Order — ₹520] → creates order → redirects to /order/success/[id]
- UPI: [Proceed to Payment — ₹520] → creates order → redirects to /checkout/payment/[id]

**ORDER CREATION LOGIC (server action):**

When CTA is clicked:
1. Validate cart still has items (re-check Supabase)
2. Re-check stock for each item server-side
3. Re-fetch price from DB (never trust frontend price)
4. Re-validate city is still active
5. Create order with address_snapshot (copy of full address as JSON)
6. Create order_items rows
7. Clear cart (Supabase + Zustand + localStorage)
8. For COD: set order_status = 'placed', payment_status = 'pending'
9. For UPI: set order_status = 'awaiting_payment', payment_status = 'pending'
10. Insert into order_status_history
11. Decrement stock_qty (do this in a DB transaction)
12. Redirect

---

### PART C — UPI Payment Page

#### 4. UPI payment page
`src/app/(user)/checkout/payment/[orderId]/page.tsx`

**Guard:** verify order belongs to current user, status is 'awaiting_payment'.
If not → redirect to /orders.

**Layout:** centered, max-w-md, cream bg, white card.

**TOP:**
"Complete Your Payment" — serif maroon heading
Order number: "#ORD1042" grey 12px
Amount: "₹520" — Playfair Display, 36px, maroon bold

**COUNTDOWN TIMER:**
15-minute window from order placement.
Show: "⏱ Complete within 12:45" — amber text.
Progress bar below: amber fill depleting left to right.
On expire: auto-cancel order, show "Order Cancelled — Time expired"
with [Return to Cart] button and restore items to cart.
Use `useEffect` with `setInterval` for the countdown.

**QR CODE BLOCK:**
White inner card, maroon border 2px, rounded-xl, centered.

Generate QR from this UPI string:
```
upi://pay?pa={NEXT_PUBLIC_UPI_ID}&pn=Patel%20Farsan&am={order.total}&cu=INR&tn={order.order_number}
```

Use `react-qr-code` package:
```tsx
import QRCode from 'react-qr-code'
<QRCode value={upiString} size={180} fgColor="#5C1A15" />
```

Below QR: "Scan with any UPI app" grey text.

UPI ID row: 
`patelfarsan@okaxis` in monospace + copy-to-clipboard icon.
On copy: "Copied!" toast.

Mobile app buttons row:
[GPay] [PhonePe] [Paytm] — outlined maroon pills.
Each is an `<a href={upiString}>` which opens the app on mobile.

**ORNAMENTAL DIVIDER**

"After completing payment" — grey center text with gold lines.

**UTR SUBMISSION:**
Label: "Enter UTR / Transaction Reference Number" — maroon 13px semibold
Helper: "12-digit number from your UPI app's payment history" — grey 11px

Expandable help:
"Where do I find this? ▼" — toggle to show step-by-step:
1. Open GPay/PhonePe
2. Go to Transaction History  
3. Find this payment (₹520 to Patel Farsan)
4. Copy the 12-digit UTR/reference number

Input: numeric, max 12 digits.
Validation: exactly 12 digits before enabling submit.

[✓ I've Paid — Verify Payment] — full-width maroon button.
Disabled until UTR is 12 digits.

**ON SUBMIT:**
1. Update order: `utr_number = input`, `payment_status = 'awaiting_verification'`
2. Card content swaps to verification state:
   - Large amber clock emoji (or lucide Clock icon, 48px, amber)
   - "Payment Submitted!" — maroon serif 20px
   - "We'll verify your payment within 30 minutes and start preparing your order."
   - [Track My Order] outlined maroon button → /orders/[orderId]

---

### PART D — Order Success Page

#### 5. Order success page
`src/app/(user)/order/success/[orderId]/page.tsx`

**Guard:** verify order belongs to current user.

Cream background, centered content, max-w-sm, no sidebar.

**CHECK MARK ANIMATION:**
Large circle: maroon bg, gold border-4, rounded-full, 80px.
Inside: gold checkmark (lucide Check, 40px).
Entry animation: scale from 0 to 1 with slight bounce.
(Use CSS animation, not a library.)

"Order Placed Successfully!" — Playfair Display, maroon, 24px, text-center.

OrnamentalDivider.

**ORDER NUMBER BOX:**
Border 2px gold, rounded-xl, bg-amber-50, p-4, text-center.
"Order Number" — grey 11px label
"#ORD1042 📋" — maroon 18px bold, monospace. Click 📋 to copy.

**INFO CARD:**
White card, rounded-xl, border cream-dark.
Two rows:
"Estimated Delivery" | "Today 5–8 PM" (maroon bold right)
"Payment" | COD: "Cash on delivery" amber | UPI: "⏳ Verification pending" amber

**STATUS MESSAGE:**
Amber strip with emoji: "🍳 Your farsan is being prepared!"

**BUTTONS:**
[📍 Track My Order] — full-width solid maroon
[Continue Shopping] — full-width outlined maroon below

**BOTTOM:**
"Confirmation details sent to your mobile" — grey 11px center.

---

## IMPORTANT NOTES

1. The city dropdown on checkout is the ENTIRE delivery restriction mechanism.
   It only shows active cities. No city = no checkout. No extra validation needed.

2. NEVER trust prices from the browser. Always recalculate total server-side
   using DB prices when creating the order.

3. UPI QR is generated CLIENT-SIDE using `react-qr-code`. No server call needed.
   The UPI string is built from env vars + order total + order number.

4. Stock decrement must happen inside a Supabase transaction:
   ```sql
   update products set stock_qty = stock_qty - {qty} 
   where id = {id} and stock_qty >= {qty}
   ```
   If the update affects 0 rows (someone else bought the last one),
   abort the order and show "Sorry, {product} just went out of stock."

5. When the 15-minute UPI timer expires:
   - Update order status to 'cancelled', cancellation_reason = 'Payment timeout'
   - Restore stock_qty for all order items
   - Show cancelled message with [Return to Cart] that re-adds items

6. "awaiting_verification" means admin needs to manually verify in their panel.
   This is correct behaviour — no automatic payment confirmation without Razorpay.

---

## VERIFY

After Stage 5:
- Checkout loads with saved addresses
- New address form validates correctly
- City dropdown shows only active cities
- City info strip appears after selecting a city
- Min order error shows and blocks checkout
- Payment method selection works
- Order creates correctly in Supabase
- Cart clears after order
- UPI page shows QR code
- Countdown timer works
- UTR submit updates order to awaiting_verification
- Success page shows with order number
- Copy order number works

**Next: Open `06-TRACKING-ORDERS.md`**
