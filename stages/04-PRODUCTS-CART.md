# 04 — Products & Cart
# Paste this entire file into Claude Code

---

## CONTEXT

Project: Patel Farsan
Stage 4: Product listing, product detail, cart system.
Brand: Maroon #5C1A15, Gold #C99A2E, Cream #FDF1DC

---

## YOUR TASK — Stage 4: Products + Cart

### PART A — Cart Store (Zustand)

#### 1. Cart store
`src/store/cartStore.ts`

Use Zustand with persist middleware (localStorage).
State:
- `items: CartItem[]` (CartItem = { product: Product, quantity: number })
- `isOpen: boolean` (cart sidebar open/close)

Actions:
- `addItem(product: Product)` — if exists increment qty, else add with qty 1
- `removeItem(productId: string)` — remove completely
- `updateQuantity(productId: string, quantity: number)` — set qty, remove if 0
- `clearCart()` — empty cart
- `toggleCart()` — toggle isOpen
- `getItemCount(): number` — total items
- `getSubtotal(): number` — sum of price × qty
- `syncWithDB(userId: string)` — on login, merge localStorage cart with DB cart

Cart should sync to Supabase `cart_items` table for logged-in users.
For guests, persist in localStorage only.

#### 2. useCart hook
`src/hooks/useCart.ts`

Thin wrapper around cart store that also exposes:
- `isInCart(productId: string): boolean`
- `getItemQuantity(productId: string): number`

---

### PART B — Product API Routes

#### 3. Products API
`src/app/api/products/route.ts`

GET /api/products
- Query params: `category`, `search`, `featured`, `limit`, `offset`
- Returns products with category join
- Server-side Supabase client (service role)
- Filters: `is_available = true`, `is_deleted = false`

#### 4. Single product API
`src/app/api/products/[id]/route.ts`

GET /api/products/[id]
- Returns single product with category
- Also returns 4 related products from same category

---

### PART C — Product Components

#### 5. ProductCard component
`src/components/product/ProductCard.tsx`

This is the most-used component in the entire site. Make it beautiful.

Props: product, showAddToCart (default true)

Card design:
- White card, `rounded-xl`, `border-t-4 border-t-maroon`
- Warm shadow: `shadow-[0_4px_16px_rgba(92,26,21,0.08)]`
- Hover: `hover:-translate-y-1 transition-all duration-300`

Top: square image (aspect-square, object-cover)
If no image: cream gradient placeholder with food emoji
"Bestseller" gold badge top-left if `is_featured = true`
"Only X left" amber badge top-right if `stock_qty < 10`

Body padding (p-3):
- Gujarati name: `font-gujarati font-bold text-maroon text-sm`
- English name: `text-stone-400 text-xs`
- Price row: `₹{price}` maroon bold | `/ {unit}` stone-400 small
- Divider line: 1px gold opacity-20

Bottom:
Three states for the CTA:
- Out of stock: full-width grey "Out of Stock" button, disabled
- In cart: full-width maroon stepper [−] qty [+] with remove link below
- Not in cart: full-width maroon "Add to Cart" button

All state changes are instant (Zustand), no loading.

#### 6. ProductGrid component
`src/components/product/ProductGrid.tsx`

Props: products, isLoading, emptyMessage

Grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`

Loading: show 8 skeleton cards (grey shimmer animation, 
same shape as ProductCard).

Empty: use EmptyState component with bowl emoji.

#### 7. ProductFilters component
`src/components/product/ProductFilters.tsx`

Mobile: hidden by default, opens as a bottom Sheet (shadcn).
Filter icon button at top — shows filter count badge if active.

Desktop: always-visible sidebar (240px).

Content:
- Search input with magnifier icon
- Category pills (not checkboxes — tappable pills for mobile friendliness)
  Active category: maroon bg white text
  Inactive: outlined maroon
- "In Stock Only" toggle
- Sort select: Popular, Price ↑, Price ↓, Newest
- [Clear All] gold link when any filter is active

---

### PART D — Product Pages

#### 8. Product listing page
`src/app/(user)/products/page.tsx`

URL params: `?category=x&search=y&sort=z&instock=true`

Layout:
- Mobile: search bar + filter button at top, then product grid
- Desktop: sidebar filters (240px) + product grid (flex-1)

Page heading: "Our Menu" with item count "24 items".
OrnamentalDivider below heading.

Fetch products server-side based on URL params.
Pass to ProductGrid component.

Breadcrumb: Home / Menu

#### 9. Product detail page
`src/app/(user)/products/[id]/page.tsx`

Two-column layout desktop (60/40), stacked mobile.

LEFT — Image area:
Large square image (aspect-square, rounded-xl, object-cover).
If no image: beautiful warm gradient placeholder.
"Bestseller" badge overlaid if featured.
Thumbnail strip below if multiple images (just one for now).

RIGHT — Details:
Breadcrumb: Home / Menu / {category} / {name}
Gujarati name: `font-gujarati text-3xl font-bold text-maroon`
English name: `text-stone-400 text-lg mb-1`

Stock indicator:
- In stock (>10): green pill "✓ In Stock"
- Low stock (<10): amber pill "⚡ Only {n} left"
- Out of stock: red pill "✕ Out of Stock"

Price: `₹{price}` maroon 28px bold | `/ {unit}` stone-400

OrnamentalDivider (sm)

Description paragraph: stone-600, 15px, leading-relaxed.

White info card (quantity selector):
- "Quantity" label left, "Total: ₹{price × qty}" right (live update)
- Centered stepper: [−] big | qty number 24px bold | [+] big
  Buttons: maroon circle 36px
  Min: 1, Max: stock_qty

Two buttons stacked:
1. [🛒 Add to Cart] — solid maroon, full width — adds to Zustand + Supabase
2. [⚡ Buy Now] — outlined maroon, full width — adds to cart then → /checkout

Info rows (small icons from lucide):
- Clock: "Made fresh every morning"
- Truck: "Delivery to selected cities"
- Package: "Minimum order applies per city"

BELOW THE FOLD:
"You May Also Like" section with OrnamentalDivider.
4 related products from same category.
Horizontal scroll on mobile.

MOBILE STICKY BOTTOM:
Fixed bottom bar (above BottomNav if visible) when scrolled past the button:
Shows product name + price | [Add to Cart] button.

---

### PART E — Cart Page

#### 10. Cart page
`src/app/(user)/cart/page.tsx`

Two-column desktop (65/35), single column mobile.

LEFT — Items list:

Each CartItem row:
- Product thumbnail 80px × 80px, rounded-lg
- Product name (Gujarati + English stacked)
- Price per unit in grey
- Stepper: [−] qty [+] in maroon (inline, compact)
- Line total: maroon bold, right side
- Trash icon: red, removes item with undo toast

Out-of-stock item in cart (check against DB on mount):
Show red warning strip: "No longer available — Remove to continue"
Remove button in red.
Checkout button disabled until removed.

Item removed toast: 
"Ganthiya removed from cart · [Undo]"
Toast disappears after 5 seconds, Undo within that window restores it.

Empty cart state:
Large bowl emoji, "Your cart is empty", 
"Start Shopping" maroon button → /products

RIGHT — Summary card:
White card, rounded-xl, border cream-dark, sticky top-24 on desktop.
"Order Summary" heading.
Subtotal: ₹{amount}
Delivery: "Calculated at checkout" in grey italic.
OrnamentalDivider (sm).
Total: ₹{subtotal} in maroon 22px bold.
[Proceed to Checkout] full-width maroon button.
[Continue Shopping] ghost link below.

MOBILE: Summary is fixed bottom bar.
Shows "Total: ₹{amount}" | [Checkout →] button.

---

## IMPORTANT NOTES

1. Cart state lives in Zustand (instant UI) but ALSO syncs to Supabase
   `cart_items` table when user is logged in.
   
2. On page load: if logged in, load cart from Supabase (not localStorage).
   If logged out: load from localStorage.
   
3. When user logs in: merge localStorage cart with DB cart, then clear localStorage.

4. Quantity +/− on product pages also updates the cart icon badge in Navbar.

5. Server components fetch data, pass to client components.
   ProductCard is a CLIENT component (needs onClick handlers).

6. Image loading: use Next.js `<Image>` with fallback to emoji placeholder.

7. All prices displayed as: `₹120` not `Rs. 120` not `120 INR`.

---

## VERIFY

After Stage 4:
- Product listing loads with filters working
- Search filters products in real time (debounced 300ms)
- Product detail page shows correctly
- Add to Cart works — badge updates in navbar
- Quantity stepper works on listing and detail
- Cart page shows items
- Remove with undo works
- Checkout button active/disabled based on cart validity
- Supabase cart_items table shows items when logged in

**Next: Open `05-CHECKOUT-PAYMENT.md`**
