# 03 — Auth + Design System + Landing Page
# Paste this entire file into Claude Code

---

## CONTEXT

Project: Patel Farsan — Gujarati farsan online shop
Stack: Next.js 14 App Router, Tailwind, Supabase, TypeScript
Design vibe: Traditional ethnic Indian — warm, premium, family-run feel.
NOT generic food app template. Think premium halwai shop meets modern e-commerce.

Primary: Deep Maroon #5C1A15
Accent: Antique Gold #C99A2E  
Background: Warm Cream #FDF1DC
Surface: White #FFFFFF

---

## YOUR TASK — Stage 3: Auth + Design + Landing

### PART A — Shared Design Components

#### 1. OrnamentalDivider component
`src/components/shared/OrnamentalDivider.tsx`

A traditional Indian decorative divider used between sections.
Gold horizontal lines with a decorative center symbol (❧ or ✦).
Two sizes: sm (thin, for inside cards) and lg (for between sections).
Props: size, symbol, className.

#### 2. StatusBadge component
`src/components/shared/StatusBadge.tsx`

Pill badge for order statuses.
Each status has its own color:
- placed → slate
- confirmed → blue  
- packed → amber
- out_for_delivery → orange
- delivered → green
- cancelled → red
- awaiting_payment → yellow
- awaiting_verification → yellow

#### 3. EmptyState component
`src/components/shared/EmptyState.tsx`

Centered empty state with an emoji illustration, heading, subtext,
and an optional CTA button.
Props: emoji, heading, subtext, ctaLabel, ctaHref.

#### 4. Navbar component
`src/components/layout/Navbar.tsx`

Desktop (≥768px):
- Left: logo — "પટેલ ફરસાણ" in Playfair Display maroon serif + 
  "Patel Farsan" small gold below it
- Center: nav links — Home · Menu · Track Order · About · Contact
  Active link: gold color with gold underline
- Right: cart icon (lucide ShoppingCart) with item count badge in red,
  then either "Login" gold button or user avatar dropdown when logged in
  Avatar dropdown: My Orders, My Account, Logout

Mobile (<768px):
- Left: hamburger menu icon (opens a drawer)
- Center: logo
- Right: cart icon with badge
- Drawer: full navigation links + login/logout

Sticky top, background maroon #5C1A15, slight drop shadow on scroll.

#### 5. BottomNav component (mobile only)
`src/components/layout/BottomNav.tsx`

Fixed bottom bar, only visible on mobile (<768px).
5 tabs: Home (house icon), Menu (utensils), Cart (shopping-cart with 
badge), Orders (package), Account (user).
Active tab: maroon icon + maroon label, gold dot above icon.
Inactive: muted grey.
White background, top border gold opacity-30.

#### 6. Footer component
`src/components/layout/Footer.tsx`

Three-column layout, dark maroon background (#3d110e), gold text.
Col 1: Logo + tagline in Gujarati + English
Col 2: Quick links with gold hover
Col 3: Shop address, phone (tel: link), WhatsApp link, hours
Bottom bar: copyright in gold opacity-60.
OrnamentalDivider above the footer (gold).

---

### PART B — Authentication Pages

#### 7. Register page
`src/app/(auth)/register/page.tsx`

Cream background, centered card (max-w-md), white card with rounded-2xl,
border-t-4 border-maroon, soft warm shadow.
Above the card: logo mark + "Patel Farsan" serif heading.

Fields: Full Name, Mobile (+91 prefix badge in gold), Email (optional),
Password (with eye toggle), Confirm Password, Terms checkbox.

Password strength bar: 4 segments, colors red/orange/yellow/green.

Button: "Create Account" — full width maroon, disabled when form invalid,
loading spinner state "Creating account…".

Error banner: red tinted card at top with ⚠ icon.

On success: redirect to home page.
On duplicate phone: show inline error "This number is already registered."

Supabase signUp call with user metadata: { name, phone, role: 'user' }

#### 8. Login page
`src/app/(auth)/login/page.tsx`

Same layout as Register.
Sub-heading in gold italic: "Since 1985 — Taste of Gujarat"

Fields: Mobile or Email, Password (eye toggle).
Row: Remember me checkbox | Forgot Password? link (gold, right aligned).

After login: check user role from profiles table.
If admin → redirect to /admin
If user → redirect to / or the `next` query param.

---

### PART C — Landing Page

#### 9. User layout
`src/app/(user)/layout.tsx`

Wrap with Navbar + Footer + BottomNav.
Import the cart store here and hydrate it for logged-in users.

#### 10. Landing page
`src/app/(user)/page.tsx`

Build a beautiful, warm, high-conversion landing page.
This is the most important page. Make it exceptional.

**HERO SECTION:**
Full-width, cream background with a subtle radial gradient from 
cream-dark at center to cream at edges (very subtle, not harsh).
Decorative maroon corner ornaments (CSS, not images).

Left column (60%):
- Small pill tag: "🏪 Authentic Gujarati Since 1985" — gold bg, maroon text
- Display heading in two lines using Playfair Display:
  Line 1: "સ્વાદ ગુજરાતીનો," — maroon, 48px desktop / 32px mobile
  Line 2: "Taste of Gujarat." — maroon opacity-70, 36px / 24px italic
- Subheading: "Fresh farsan, handcrafted daily since 1985. 
  Now delivered to your doorstep." — stone-600, 16px, max-w-sm
- Two buttons: [Order Now →] solid maroon | [Browse Menu] outlined
- Trust badges row: three small badges —
  "✓ Made Fresh Daily", "✓ Same-day Delivery", "✓ Since 1985"
  Each badge: white bg, maroon border, maroon text, 12px

Right column (40%):
- A beautiful circular frame (border-4 border-gold rounded-full) 
  with a large food emoji placeholder (🍽)
- Decorative gold dots at N/S/E/W compass points around the circle
- Below: rotating text "ગાંઠિયા · જલેબી · ખાખરા · ચકલી" in gold italic

Mobile: stack vertically, hero image above text.

**CATEGORIES SECTION:**
Cream background, full width.
Heading: "Shop by Category" with OrnamentalDivider below.
6 circular tiles in a row (horizontal scroll on mobile, grid on desktop).
Each tile: maroon circle (64px), food emoji inside, Gujarati name below,
English name smaller grey.
Hover: gold ring around circle, scale 1.05.

**BESTSELLERS SECTION:**
White background (section break from cream).
Heading: "આ અઠવાડિયાના ફેવરિટ" with gold divider below,
"This Week's Favourites" in grey small below heading.
Fetch featured products from Supabase: `is_featured = true limit 8`.
Grid: 2 col mobile, 4 col desktop.
ProductCard component (see Stage 4).
"View Full Menu →" gold link, right aligned.

**DELIVERY CITIES STRIP:**
Full-width dark maroon (#3d110e) section.
"We Deliver To" gold label, then city pills.
Fetch active cities from Supabase.
Each pill: gold border, gold text, rounded-full.
Smaller grey text below: "Don't see your city? We're expanding soon."

**HOW IT WORKS:**
Cream background.
Heading: "How It Works" with OrnamentalDivider.
4 steps in a row (2x2 on mobile):
1. 🛍 Browse Menu
2. 🛒 Add to Cart
3. 💳 Pay or COD
4. 🚚 Get Delivered
Each step: number circle (maroon), emoji, title, one-line desc.
Steps connected by dashed gold line on desktop.

**OUR STORY:**
Two columns on desktop, stacked on mobile.
Left: square image frame (placeholder with a warm gradient + shop emoji).
Right: 
  - "Since 1985" — gold serif, 14px
  - "Made with love, served with pride." — maroon serif 24px
  - 2-3 lines about the family tradition
  - Gold italic quote: "દરેક ઘડીને ખાસ બનાવો"

---

## IMPORTANT DESIGN NOTES FOR CLAUDE CODE

1. NO generic Tailwind blue anywhere. Everything is maroon/gold/cream.

2. The font system:
   - Headings: `font-serif` (Playfair Display)
   - Gujarati text: `font-gujarati` (Noto Sans Gujarati)  
   - Body/UI: `font-sans` (Inter)

3. Cards always have:
   - `rounded-xl` corners
   - `border border-cream-dark` or `border border-stone-100`
   - Warm shadow: `shadow-[0_4px_16px_rgba(92,26,21,0.08)]`
   - Product cards: `border-t-4 border-t-maroon`

4. Buttons:
   - Primary: `bg-maroon hover:bg-maroon-light text-white`
   - Secondary: `border-2 border-maroon text-maroon hover:bg-maroon hover:text-white`
   - Gold: `bg-gold text-maroon font-bold`

5. Every section needs top and bottom padding of at least `py-12`.

6. The OrnamentalDivider (gold line + center symbol) goes between
   every major heading and the content below it.

7. Smooth scroll behavior: `scroll-behavior: smooth` on html tag.

8. Hover animations: 
   - Cards: `hover:-translate-y-1 transition-transform duration-200`
   - Buttons: `hover:scale-[1.02] transition-transform duration-150`
   - Category tiles: `hover:scale-105 transition-transform duration-200`

---

## VERIFY

After completing Stage 3:
- Register with a test account — should create a row in profiles table
- Login — should redirect to home
- Landing page loads with all sections
- All sections show data from Supabase (or fallback if empty)
- Mobile bottom nav is visible
- Navbar shows login button when logged out, avatar when logged in

**Next: Open `04-PRODUCTS-CART.md`**
