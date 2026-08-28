# 06 — Order Tracking + My Orders + Account
# Paste this entire file into Claude Code

---

## CONTEXT

Project: Patel Farsan
Stage 6: Order tracking with realtime, my orders list, account/profile page.

---

## YOUR TASK — Stage 6: Tracking + Orders + Account

### PART A — Realtime Hook

#### 1. useRealtimeOrder hook
`src/hooks/useRealtimeOrder.ts`

Subscribe to a specific order's status changes via Supabase Realtime.

```typescript
// What it does:
// 1. Initial fetch: load order + order_status_history from Supabase
// 2. Subscribe: listen for UPDATE events on public.orders where id = orderId
// 3. On change: re-fetch the full order + history
// 4. Cleanup: unsubscribe on unmount

// Returns: { order, history, isLoading, error }
```

Use `supabase.channel()` with `postgres_changes` filter.
Reconnect on network error (Supabase handles this automatically).

---

### PART B — Order Tracking Page

#### 2. OrderStepper component
`src/components/order/OrderStepper.tsx`

This is the centrepiece of the tracking page. Make it outstanding.

Props: currentStatus, history (OrderStatusHistory[])

The 5 main statuses in order:
`placed → confirmed → packed → out_for_delivery → delivered`

Each step has:
- A circle indicator (left of step label)
- Step label (maroon bold if done/current, grey if upcoming)
- Timestamp from history (grey 11px if done/current, "—" if upcoming)
- A short contextual message (only for current and done steps)

**Circle states:**
- Done: filled maroon circle, white checkmark inside
- Current: maroon ring (border-2 border-maroon), pulsing dot inside
  Add a gentle pulse animation: 
  `@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`
- Upcoming: grey ring, grey dot

**Connecting line between steps:**
- Done → Done: solid maroon line
- Done → Current: half maroon, half grey
- Anything → Upcoming: grey

On MOBILE: vertical layout (steps stack top to bottom).
On DESKTOP: horizontal layout (steps in a row).

**Contextual messages per status:**
- placed: "We've received your order"
- confirmed: "Your order is confirmed and being prepared"
- packed: "Your farsan is freshly packed and ready"
- out_for_delivery: "On the way! Our delivery partner will call shortly."
  Show a [📞 Call Delivery Partner] gold outlined button here.
- delivered: "Delivered! Enjoy your farsan. 🎉"
  Show a [⭐ Rate Your Order] gold button here.

**Special states:**
- cancelled: Replace entire stepper with a red banner:
  "Order Cancelled" maroon heading
  Reason text if available
  Refund note if payment was made: "Refund will be processed in 3-5 days."
  [Reorder] outlined maroon button.

- awaiting_payment: Amber banner ABOVE stepper:
  "⏳ Waiting for payment to be completed"
  [Complete Payment] link → /checkout/payment/[orderId]

- awaiting_verification: Amber banner ABOVE stepper:
  "⏳ Payment submitted — verifying within 30 minutes"

#### 3. Order tracking page
`src/app/(user)/orders/[orderId]/page.tsx`

Use `useRealtimeOrder` hook for live updates.

**TOP CARD:**
White card, rounded-xl, border cream-dark.
"#ORD1042" maroon bold | Date grey | StatusBadge (large).

**STEPPER:** (the OrderStepper component above)

**DELIVERY INFO CARD:**
White card below stepper.
"📍 Delivery Address" maroon 12px heading.
Full address text: Name, Address line, City, Pincode.

**ORDER ITEMS:**
Compact list: thumbnail + name (Gujarati) + qty × price = line total.
Total row at bottom: "Total: ₹520".

**HELP ROW:**
Two outlined gold buttons: [📞 Call Us] and [💬 WhatsApp]
Phone from NEXT_PUBLIC_SHOP_PHONE.
WhatsApp: `https://wa.me/{NEXT_PUBLIC_SHOP_WHATSAPP}?text=Hi, my order ${orderNumber}...`

---

### PART C — My Orders Page

#### 4. OrderCard component
`src/components/order/OrderCard.tsx`

Props: order (with items).

Design:
- White card, rounded-xl, `border-t-4 border-t-maroon`
- Warm shadow

Top row:
"#{order_number}" maroon bold 13px | StatusBadge right

Date row: "{date}, {time}" stone-400 11px

Items preview: 
3 product thumbnails (32px squares, rounded-md) + "+{n} more" grey pill.
If only 1-3 items, show all without the "+ more".

Meta row: "{n} items · ₹{total} · {COD/UPI}" stone-400 10px

Button row:
[Track Order] — solid maroon (for active orders) 
OR [View Details] — outlined maroon (for delivered/cancelled)
[↺ Reorder] — outlined maroon (for all orders)

Reorder logic:
- Add all still-available items back to cart
- Show toast: "3 items added to cart" 
  If any skipped: "+ 2 unavailable items skipped"

#### 5. My Orders page
`src/app/(user)/orders/page.tsx`

"My Orders" — serif maroon heading, with OrnamentalDivider.

Filter tabs: All · Active · Delivered · Cancelled
Active tab: bg-maroon text-white rounded-full px-4 py-1.5
Inactive: outlined maroon rounded-full.

"Active" = status in [placed, confirmed, packed, out_for_delivery, awaiting_payment].

Fetch orders with order_items from Supabase, newest first.

List of OrderCard components.

Loading: 3 skeleton OrderCards (grey shimmer).

Empty state per tab:
- All empty: "No orders yet" + [Start Shopping] button
- Active empty: "No active orders" + [Browse Menu] button
- Delivered empty: "No delivered orders yet" (grey, no CTA)
- Cancelled empty: "No cancelled orders" (grey, no CTA)

---

### PART D — Account Page

#### 6. Account page
`src/app/(user)/account/page.tsx`

Mobile layout: stacked sections.
Desktop: sidebar nav (200px) + content area.

**PROFILE HEADER:**
Maroon bg section at top.
Avatar circle: 64px, bg-gold, maroon initials (first letter of first+last name).
Below: name (white bold), phone (white opacity-70).
Small gold text: "Member since {year} · {n} orders"
Edit profile icon (pencil, gold) top-right of header.

**MENU ITEMS (mobile) / TABS (desktop):**

My Profile:
- Editable fields: Full Name, Mobile (readonly — phone is identity), Email
- [Save Changes] maroon button
- Change Password: collapsible section
  Old password, New password, Confirm — then [Update Password]

My Addresses:
- List of AddressCard components (view mode, with edit/delete)
- [+ Add New Address] dashed card → opens AddressForm in a Sheet/Dialog
- On edit: opens AddressForm pre-filled in a Sheet
- On delete: confirmation dialog "Delete this address?"

My Orders:
- Link to /orders page (or embed the orders list here)

Logout:
- Shows in red in the menu
- Confirmation dialog: 
  "Logging out of Patel Farsan?"
  [Cancel] | [Logout] danger red button
- On confirm: supabase.auth.signOut(), redirect to home, clear cart store

---

### PART E — Public Order Tracking (no login)

#### 7. Public track order page
`src/app/track/page.tsx`

Reachable from navbar "Track Order" link. No auth required.

Simple centered card:
"Track Your Order" — serif maroon heading.
Two inputs:
- Order Number (e.g. ORD202508001)
- Mobile Number (10 digits)

[Track Order] maroon button.

On submit:
Supabase query:
```sql
select * from orders
where order_number = $1
and address_snapshot->>'phone' = $2
```
If found: render the same tracking stepper (read-only, no auth needed).
If not found: red banner "Order not found. Check your order number and mobile."

This is useful when a family member ordered and wants to check.

---

## REALTIME EXPLAINED

When admin changes order status in admin panel:
1. Supabase UPDATE fires on orders table
2. Supabase broadcasts to all subscribers on that channel
3. Customer's tracking page receives the event
4. useRealtimeOrder hook refetches full order data
5. OrderStepper re-renders with new status
6. User sees the step advance (with CSS transition) without refreshing

If user's browser is offline: Supabase queues the event.
When they come back online: they get the latest status.

Polling fallback (simpler alternative):
If Realtime feels complex, use polling:
```typescript
// In the tracking page component:
useEffect(() => {
  const interval = setInterval(() => {
    refetchOrder()
  }, 10000) // every 10 seconds
  return () => clearInterval(interval)
}, [])
```
User cannot notice 10-second polling vs realtime for order tracking.

---

## VERIFY

After Stage 6:
- Tracking page loads with correct order data
- Stepper shows correct current step
- Realtime (or polling) updates status without refresh
- Cancelled/payment-pending states show correct UI
- My Orders page loads all orders
- Filter tabs work correctly
- Reorder adds items to cart
- Account page loads profile data
- Edit profile saves correctly
- Address add/edit/delete works
- Logout clears session and cart
- Public track order finds order with number + phone

**Next: Open `07-ADMIN.md`**
