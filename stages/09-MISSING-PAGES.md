# 09 — Missing Pages (Add After Stage 08)
# Paste this entire file into Claude Code

---

## CONTEXT

Project: Patel Farsan
This file adds 3 pages that were missing from the main build:
1. /about — Shop story page
2. /contact — Contact page  
3. /admin/categories — Admin categories management

---

## YOUR TASK — Stage 9: Missing Pages

### PAGE 1 — About Page
`src/app/(user)/about/page.tsx`

Add "About" link to Navbar and Footer (it may already be there as a dead link — now make it work).

**Layout:** Cream background, max-w-4xl centered, generous padding.

**SECTION 1 — HERO:**
Full-width warm section.
Large Playfair Display heading:
"Since 1985, Made with Love."
Subtitle: "A Gujarati family tradition, now at your doorstep."
OrnamentalDivider below.

**SECTION 2 — OUR STORY (two columns):**
Left column: 
- Square frame (400×400, rounded-2xl) 
- Warm cream-to-amber gradient inside
- Large shop emoji 🏪 centered
- Gold border-4 around frame
- "Est. 1985" gold text below

Right column:
- " આ છે આપણી વાર્તા" — gold italic serif 14px (section eyebrow)
- "Our Story" — maroon Playfair 32px
- OrnamentalDivider (sm)
- Story paragraphs (2-3 paragraphs, warm and personal):

  Para 1: "Patel Farsan was founded in 1985 by our family in the heart of Gujarat. 
  What started as a small shop with just a few recipes passed down through generations 
  has grown into a beloved local institution."

  Para 2: "Every morning, our kitchen comes alive before sunrise. Our artisans use 
  the same traditional recipes — pure besan, fresh spices, cold-pressed oil — that 
  our founder used four decades ago. No shortcuts. No compromises."

  Para 3: "Today, we bring that same freshness and love to your doorstep. 
  From our family to yours — સ્વાદ ગુજરાતીનો, સંસ્કાર આપણી પરંપરાનો."

**SECTION 3 — WHY WE'RE DIFFERENT (3 value cards):**
White background section.
Heading: "What Makes Us Different" with OrnamentalDivider.

3 cards in a row (stack on mobile):

Card 1: 🌅 "Made Fresh Daily"
"Every batch is made fresh each morning. We never store yesterday's farsan."

Card 2: 🫙 "Traditional Recipes"
"Our recipes are 40+ years old. Passed from generation to generation. Never changed."

Card 3: 🚚 "Delivered to You"
"What took a trip to the shop now comes to your home. Same freshness, same love."

Each card: white bg, rounded-xl, border-t-4 border-t-gold, padding, 
large emoji centered, maroon serif heading, stone-500 body.

**SECTION 4 — NUMBERS STRIP:**
Dark maroon background.
4 numbers in a row:

"1985" | "Since" below
"40+" | "Recipes" below  
"4" | "Cities" below
"Daily" | "Fresh" below

Gold numbers, white labels. Simple, strong.

**SECTION 5 — OUR VALUES:**
Cream background.
Heading: "Our Promise" with OrnamentalDivider.

3 rows, each: gold icon | maroon bold text | stone-500 description
- ✓ No artificial colors or preservatives
- ✓ Prepared in a hygienic, certified kitchen
- ✓ Ingredients sourced fresh every morning

**SECTION 6 — CTA:**
Centered, cream bg.
"Ready to taste the difference?"
[Order Now →] large maroon button
[Browse Menu] outlined below

---

### PAGE 2 — Contact Page
`src/app/(user)/contact/page.tsx`

Add "Contact" to Navbar and Footer.

**Layout:** Cream background, two-column desktop (60/40), stacked mobile.

**LEFT COLUMN — Contact Info:**

"Get in Touch" — maroon Playfair 28px
"We're a family business — real people answer." — stone-500 italic

OrnamentalDivider.

Contact cards (each a white rounded-xl card with icon + details):

📍 **Visit Us**
Your shop address (placeholder — admin can update)
"Patel Farsan, Main Market, Anand, Gujarat — 388001"
[Open in Maps] gold link → Google Maps

📞 **Call Us**  
"+91 98765 43210"
[Tap to Call] gold link — `href="tel:+919876543210"`
"Mon–Sat: 7 AM – 8 PM · Sun: 8 AM – 2 PM"

💬 **WhatsApp**
"Chat with us for quick help"
[Open WhatsApp] green button → `https://wa.me/919876543210`

📧 **Email**
"patelfarsan@gmail.com" (placeholder)
[Send Email] gold link

**RIGHT COLUMN — Contact Form:**
White card, rounded-2xl, border-t-4 border-t-maroon, warm shadow.

"Send us a Message" — maroon serif 18px
Subtitle: "We reply within a few hours." — stone-500 12px

Fields:
- Your Name — text input
- Mobile Number — text input
- Subject — select: "Order Issue | Product Question | Delivery Query | Feedback | Other"
- Message — textarea (4 rows)
- [Send Message] full-width maroon button

**On submit:**
Since there's no email backend set up yet, do one of two things:
Option A: Open the user's email app with mailto: link (simplest)
```
mailto:patelfarsan@gmail.com
  ?subject={subject}
  &body=Name: {name}%0APhone: {phone}%0A%0A{message}
```

Option B: If RESEND_API_KEY exists in env, POST to /api/contact which sends an email.

Create the API route either way:
`src/app/api/contact/route.ts`
If RESEND_API_KEY available → send email via Resend.
If not → return success anyway (form pretends to work, admin reads WhatsApp instead).

Show success state: green check + "Message sent! We'll get back to you shortly."

**BELOW THE FOLD — Map placeholder:**
A cream-colored map placeholder card (not real Google Maps — needs API key).
"Find Us" heading.
Maroon border card with:
📍 large emoji + "Patel Farsan" maroon bold + address text
[Get Directions on Google Maps] gold link (opens Google Maps with address)

---

### PAGE 3 — Admin Categories Page
`src/app/(admin)/admin/categories/page.tsx`

Add "Categories" to AdminSidebar between Products and Orders.

**HEADER ROW:**
"Categories" — maroon serif heading (admin style: white/grey background)
[+ Add Category] maroon button right.

**CATEGORIES TABLE:**
White card.
Columns: Order | Image | Gujarati Name | English Name | Status | Actions

Order: drag handle icon (lucide GripVertical) — for reordering display_order.
Actually implement as up/down arrow buttons (simpler than drag-drop):
[↑] and [↓] buttons in grey, clicking swaps display_order with adjacent row.

Image: 40px circle thumbnail (like the customer-facing category tiles).
If no image: maroon circle with first letter of name in gold.

Gujarati Name: bold gold serif.
English Name: normal weight below.

Status: toggle switch — Active (green) / Inactive (grey).
Toggling hides/shows the category in the customer shop.

Actions: Edit (pencil) | Delete (trash, only if no products in category).

**ADD/EDIT CATEGORY DIALOG:**
Sheet or Dialog.

Fields:
- Category Name (English) — required
- Category Name (Gujarati) — required
- Display Order — number (controls position in shop)
- Category Image — file upload → Supabase Storage `category-images` bucket
  (Create this bucket in Supabase: public, same way as product-images)
- Is Active — toggle

On save: insert/update in Supabase, refresh table.

**DELETE CATEGORY:**
Check first: `select count(*) from products where category_id = {id} and is_deleted = false`
If count > 0: show error dialog:
"Cannot delete — {n} products are in this category. 
Move or delete those products first, or deactivate this category instead."
If count = 0: confirmation dialog → soft delete or hard delete.

**Update AdminSidebar navigation:**
```
📊 Dashboard
📦 Products        ← existing
🗂 Categories      ← ADD THIS
📋 Orders          ← existing
🏙 Cities          ← existing
🏪 View Shop
🚪 Logout
```

---

## COMPLETE PAGE COUNT (after all 9 stages)

### User-Facing Pages (13 total)
1. `/` — Landing page
2. `/register` — Register
3. `/login` — Login
4. `/products` — Product listing / Menu
5. `/products/[id]` — Product detail
6. `/cart` — Cart
7. `/checkout` — Checkout
8. `/checkout/payment/[orderId]` — UPI payment
9. `/order/success/[orderId]` — Order success
10. `/orders` — My orders
11. `/orders/[orderId]` — Order tracking
12. `/account` — Profile / Account
13. `/track` — Public order tracking (no login)
14. `/about` — About the shop ← ADDED
15. `/contact` — Contact ← ADDED

### Admin Pages (5 total)
1. `/admin` — Dashboard
2. `/admin/products` — Products management
3. `/admin/categories` — Categories management ← ADDED
4. `/admin/orders` — Orders management
5. `/admin/cities` — Cities management

### Total: 15 user pages + 5 admin pages = 20 pages

---

## VERIFY

After Stage 9:
- /about loads with all sections
- /contact form submits (mailto or Resend)
- /admin/categories shows table
- Categories can be added with image upload
- Display order up/down arrows work
- Deactivating a category hides it from the shop
- New category appears in product listing filters
- AdminSidebar shows "Categories" link
- Navbar "About" and "Contact" links work

---

## YOU ARE NOW COMPLETE ✓

All 20 pages built and verified.
Push to GitHub → Vercel auto-deploys → share the link.
