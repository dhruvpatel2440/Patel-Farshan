# 07 — Admin Panel
# Paste this entire file into Claude Code

---

## CONTEXT

Project: Patel Farsan
Stage 7: Complete admin panel — dashboard, products, orders, cities.
Admin is reached at /admin — only users with role='admin' can access.
Middleware already blocks non-admins. This stage builds the UI.

---

## YOUR TASK — Stage 7: Admin Panel

### PART A — Admin Layout

#### 1. Admin sidebar
`src/components/layout/AdminSidebar.tsx`

Desktop: fixed left sidebar 240px, always visible.
Mobile: hidden by default, toggles as a Sheet/Drawer.

Design:
- Dark maroon background (#3d110e)
- Logo at top: "પ.ફ. Admin" gold serif, small gold divider below

Navigation items:
- 📊 Dashboard → /admin
- 📦 Products → /admin/products
- 📋 Orders → /admin/orders
- 🏙 Cities → /admin/cities
- 🏪 View Shop → / (opens in new tab)
- 🚪 Logout → sign out

Each item: icon + label, gold text.
Active item: gold bg opacity-10, gold left border 3px.
Hover: gold bg opacity-5.

Top of sidebar on mobile: hamburger toggle button (maroon, visible).

#### 2. Admin layout
`src/app/(admin)/layout.tsx`

Validate role on server:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()
  
if (profile?.role !== 'admin') redirect('/login')
```

Layout: AdminSidebar left + `{children}` right.
Desktop: `flex h-screen overflow-hidden`.
Mobile: sidebar hidden, top bar with hamburger + logo.

Admin pages use a white/light grey background (#F8F8F8), not cream.
This differentiates admin from user-facing pages visually.

---

### PART B — Admin Dashboard

#### 3. Dashboard home
`src/app/(admin)/admin/page.tsx`

**HEADER:**
"Good morning, {adminName}" — grey 14px (use time to determine morning/afternoon/evening)
"Patel Farsan Admin" — maroon serif 24px

**STATS ROW (4 metric cards):**
```
Today's Orders  Today's Revenue  Pending Verify  Low Stock Items
     12             ₹4,820             3               2
```
Each card:
- White bg, rounded-xl, border stone-200
- Maroon top border 3px  
- Icon (lucide) in maroon circle, 40px
- Number: maroon bold 28px
- Label: stone-500 12px

**URGENT ALERTS (if any):**
Red/amber banner for:
- "🔴 {n} UPI payments awaiting verification" → [Review] link
- "🟡 {n} items with low stock" → [View] link
These appear prominently above the stats.

**RECENT ORDERS TABLE:**
White card, "Recent Orders" heading.
Table columns: Order # | Customer | Total | Payment | Status | Action
Show last 10 orders.
Each row:
- Order number: maroon bold clickable → opens order detail
- Customer name + phone
- Total: ₹ amount
- Payment: UPI / COD pill
- Status: StatusBadge
- Action: status dropdown (change status inline)

**QUICK ACTIONS:**
Three card buttons:
[+ Add Product] | [Manage Orders] | [Add City]

---

### PART C — Products Management

#### 4. Products admin page
`src/app/(admin)/admin/products/page.tsx`

**HEADER ROW:**
"Products" — maroon serif heading
[+ Add Product] maroon button right

**FILTERS:**
Search input + Category select + In Stock toggle.

**PRODUCTS TABLE:**
White card, full width.
Columns: Image | Name | Category | Price | Stock | Available | Actions

Image: 48px × 48px thumbnail, rounded-md.

Name: Gujarati bold + English small below.

Stock: number, amber if < 10, red if 0.

Available: toggle switch (green = available, grey = unavailable).
Toggling changes `is_available` in Supabase immediately.

Actions column: Edit (pencil, maroon) | Delete (trash, red).

Delete: confirmation dialog "Delete {name}? This cannot be undone."
Actually does a soft delete: `is_deleted = true`.

#### 5. Add/Edit Product dialog
Opens as a large Dialog (shadcn) or a full-page Sheet on mobile.

Fields:
- Product Name (English) — required
- Product Name (Gujarati) — required  
- Category — select from active categories
- Description — textarea
- Price (₹) — number, min 1
- Unit — text ("250g", "500g", "1kg", "piece")
- Stock Quantity — number, min 0
- Is Available — toggle
- Is Featured (shown on homepage) — toggle
- Product Image — file upload

**IMAGE UPLOAD:**
Click area → opens file picker (accept="image/*").
Preview: 200×200px square preview before upload.
On save: upload to Supabase Storage `product-images/{productId}.jpg`.
Store the public URL in `image_url`.
Max file size: 2MB. Show error if larger.

Validation: all required fields before save.

On save:
- Insert or update in Supabase products table
- Show success toast "Product saved!"
- Close dialog, refresh list

---

### PART D — Orders Management (most important admin page)

#### 6. Orders admin page
`src/app/(admin)/admin/orders/page.tsx`

**HEADER:** "Orders" — maroon serif heading

**FILTER BAR:**
Status filter tabs: All | Awaiting Payment | Active | Delivered | Cancelled
Date range: Today / This Week / This Month / Custom
Payment: All / UPI / COD
Search: by order number or customer name/phone

**PAYMENT ALERT STRIP (if UPI orders awaiting verification):**
Full-width amber banner at top:
"⚠ {n} UPI payment(s) need verification"
[Verify Now] scrolls to those orders.

**ORDERS LIST:**

Each order as an expandable card (not a table — better on mobile):

**COLLAPSED view:**
Row: Order# | Customer name + phone | ₹Total | Payment badge | Status badge | [Actions ▼]

**EXPANDED view (click to expand):**
Left section:
- Customer: Name, Phone (click-to-call), full address
- Items: table of product name + qty + line total
- Price breakdown: subtotal + delivery + total

Right section (status + payment management):
- Payment status badge + mode
- If UPI + awaiting_verification:
  Show UTR number customer submitted
  [✓ Verify Payment] green button → sets payment_status = 'paid', order_status = 'confirmed'
  [✕ Reject Payment] red button → sets payment_status = 'failed', notify customer
  
- Status update dropdown:
  Only forward transitions allowed:
  placed → confirmed → packed → out_for_delivery → delivered
  Plus "Cancel Order" always available (except delivered)
  
  On status change:
  1. Update orders.order_status
  2. Insert into order_status_history
  3. Customer's tracking page updates via Realtime
  
- Admin note field: textarea for internal notes
- [Print Invoice] button → opens print-friendly view

**PAGINATION:** 20 orders per page.

#### 7. Order detail page (optional, for complex orders)
`src/app/(admin)/admin/orders/[orderId]/page.tsx`

Full-page view of a single order.
Same information as expanded card but with more space.
Useful for large orders or complex situations.
Print button for invoice.

---

### PART E — Cities Management

#### 8. Cities admin page
`src/app/(admin)/admin/cities/page.tsx`

"Delivery Cities" — maroon serif heading.
[+ Add City] maroon button.

Simple table: City Name | Delivery Charge | Min Order | Status | Actions

Status: Active (green) / Inactive (grey).
Toggle switch to activate/deactivate instantly.
Deactivating removes city from all customer dropdowns immediately.

Add/Edit City dialog:
- City Name: text
- Delivery Charge: ₹ number
- Minimum Order Value: ₹ number
- Active: toggle

Delete: only if no existing orders use this city.
Otherwise: "This city has existing orders. Deactivate instead of deleting."

---

### PART F — Admin API Routes

#### 9. Admin-only API routes

`src/app/api/admin/orders/[id]/status/route.ts`
PATCH — update order status, insert history row.
Validates: user is admin, new status is a forward transition.

`src/app/api/admin/orders/[id]/verify-payment/route.ts`
PATCH — set payment_status = 'paid', order_status = 'confirmed'.
Validates: user is admin, current payment_status = 'awaiting_verification'.

`src/app/api/admin/products/route.ts`
POST — create product (admin only).
PUT — update product (admin only).

`src/app/api/admin/cities/route.ts`
GET, POST, PUT, DELETE — cities CRUD (admin only).

All admin routes start with:
```typescript
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

---

## IMPORTANT ADMIN NOTES

1. Admin verifies UPI payments MANUALLY.
   Process: Check your bank app (GPay/PhonePe/bank statement),
   find the UTR the customer submitted, confirm amount matches,
   then click Verify in admin panel. This is intentional.

2. Status can only go FORWARD:
   placed → confirmed → packed → out_for_delivery → delivered
   You cannot go backwards (no confirmed → placed).
   Only exception: Cancel (always available except Delivered).

3. When admin sets status to 'confirmed':
   - If UPI: verify payment first
   - If COD: confirm directly

4. When admin cancels an order:
   - Prompt for cancellation reason
   - Restore stock_qty for all items
   - If payment was made (UPI paid): note "Manual refund required"

5. Low stock alert: show admin when product.stock_qty < 10.
   Very visible — admin needs to know before running out mid-day.

---

## VERIFY

After Stage 7:
- /admin redirects non-admins to /login
- Admin dashboard shows today's stats
- Products CRUD works (add, edit, toggle, soft-delete)
- Image upload works, shows in product cards
- Orders list loads with filters
- Payment verification flow works end-to-end:
  Customer submits UTR → Admin sees it → Admin verifies → 
  Order moves to confirmed → Customer tracking updates
- Status change works and customer sees it in realtime
- Cities CRUD works
- Adding a city makes it appear in checkout dropdown immediately
- Deactivating a city removes it from checkout immediately

**Next: Open `08-POLISH-DEPLOY.md`**
