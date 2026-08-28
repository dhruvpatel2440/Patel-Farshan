# 08 — Polish + Testing + Deploy
# Paste this entire file into Claude Code

---

## CONTEXT

Project: Patel Farsan — complete online ordering system
Stage 8: Final polish, error handling, mobile optimization, deployment.

---

## YOUR TASK — Stage 8: Polish + Deploy

### PART A — Design Polish Pass

#### 1. Typography audit
Go through every page and ensure:

- ALL headings use `font-serif` (Playfair Display)
- Gujarati text uses `font-gujarati` (Noto Sans Gujarati)
- No heading uses `font-bold` with sans — always serif for headings
- Product names in Gujarati are always larger/darker than English
- Prices always show as `₹120` format (not `Rs.` or `INR`)
- Zero hardcoded `text-blue-*` classes anywhere

#### 2. Color audit
Replace any defaults with brand colors:
- `text-blue-*` → `text-maroon` or `text-gold`
- `bg-blue-*` → `bg-maroon`
- `border-blue-*` → `border-maroon` or `border-gold`
- `ring-blue-*` → `ring-maroon`
- Focus rings: `focus:ring-maroon/30` everywhere

#### 3. Micro-animations (add these throughout)

Product cards:
```css
transition: transform 0.2s ease, box-shadow 0.2s ease;
hover: translateY(-4px) shadow-[0_8px_24px_rgba(92,26,21,0.12)]
```

Buttons:
```css
active: scale(0.98) transition-transform duration-100
```

Category tiles:
```css
hover: scale(1.05) transition-transform duration-200
```

Status badge on tracking page:
When status advances, brief gold glow animation:
```css
@keyframes statusUpdate {
  0% { box-shadow: 0 0 0 0 rgba(201,154,46,0.4); }
  70% { box-shadow: 0 0 0 10px rgba(201,154,46,0); }
  100% { box-shadow: 0 0 0 0 rgba(201,154,46,0); }
}
```

Order success checkmark:
```css
@keyframes popIn {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
animation: popIn 0.5s ease forwards;
```

#### 4. Loading states
Every data fetch needs a skeleton or spinner.
Never show a blank page while loading.

Skeleton pattern for product cards:
```tsx
<div className="animate-pulse">
  <div className="bg-stone-200 aspect-square rounded-t-xl" />
  <div className="p-3 space-y-2">
    <div className="bg-stone-200 h-3 rounded w-3/4" />
    <div className="bg-stone-200 h-2 rounded w-1/2" />
    <div className="bg-stone-200 h-8 rounded mt-3" />
  </div>
</div>
```

#### 5. Error states
Every page that fetches data needs an error state.
Pattern: 
```tsx
if (error) return (
  <div className="text-center py-12">
    <p className="text-stone-400 mb-3">Something went wrong</p>
    <button onClick={retry} className="btn-outline text-sm">Try again</button>
  </div>
)
```

---

### PART B — Mobile Optimization

#### 6. Mobile-specific checks

[ ] Bottom nav does not overlap content — add `pb-20 md:pb-0` to all page containers
[ ] Touch targets are at least 44×44px — check all buttons, links, toggles
[ ] Product card buttons are full-width (easy to tap)
[ ] Cart stepper buttons [−] and [+] are min 36px
[ ] Form inputs are at least 44px tall
[ ] Modals/Sheets don't go behind the bottom nav
[ ] Horizontal scrolls (categories, bestsellers) have `scrollbar-hide` class
[ ] Long text doesn't overflow cards — use `truncate` or `line-clamp-2`
[ ] Images use `object-cover` and explicit dimensions

Add this CSS for scrollbar-hide:
```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

#### 7. Safe area insets (iPhone notch/home bar)
```css
/* In globals.css */
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

### PART C — Error Handling

#### 8. Global error boundaries

`src/app/error.tsx` — Next.js error boundary:
```tsx
'use client'
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="font-serif text-maroon text-2xl mb-2">Something went wrong</h1>
        <p className="text-stone-500 mb-6">We're sorry. Please try again.</p>
        <button onClick={reset} className="btn-primary">Try Again</button>
      </div>
    </div>
  )
}
```

`src/app/not-found.tsx` — 404 page:
```tsx
export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🍽</div>
        <h1 className="font-serif text-maroon text-2xl mb-2">Page not found</h1>
        <p className="text-stone-500 mb-6">This page doesn't exist or was moved.</p>
        <a href="/" className="btn-primary">Go Home</a>
      </div>
    </div>
  )
}
```

#### 9. Form error handling
All forms must handle:
- Network errors: "Connection failed. Check your internet and try again."
- Validation errors: shown inline under each field in red
- Server errors: shown as a banner at the top of the form
- Never show raw error messages from Supabase to the user

---

### PART D — SEO + Performance

#### 10. Metadata for all pages

```typescript
// src/app/(user)/products/page.tsx
export const metadata = {
  title: 'Our Menu — Patel Farsan',
  description: 'Browse our fresh Gujarati farsan — ganthiya, jalebi, khakhra, chakli and more. Delivered daily.',
}

// src/app/(user)/products/[id]/page.tsx
export async function generateMetadata({ params }) {
  const product = await fetchProduct(params.id)
  return {
    title: `${product.name} — Patel Farsan`,
    description: product.description,
    openGraph: { images: [product.image_url] },
  }
}
```

#### 11. Image optimization
All product images use Next.js `<Image>`:
```tsx
import Image from 'next/image'

<Image
  src={product.image_url || '/placeholder-farsan.jpg'}
  alt={product.name}
  width={300}
  height={300}
  className="object-cover"
  sizes="(max-width: 768px) 50vw, 25vw"
/>
```

Add to `next.config.js`:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '*.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
  ],
},
```

#### 12. Add a placeholder farsan image
Create `/public/placeholder-farsan.jpg`:
Use a beautiful warm gradient as fallback in CSS,
not a real image file (keeps the repo clean):

In the Image component, use an onError fallback:
```tsx
const [imgError, setImgError] = useState(false)

{!imgError && product.image_url ? (
  <Image src={product.image_url} onError={() => setImgError(true)} ... />
) : (
  <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-200 
                  flex items-center justify-center text-4xl">
    🍽
  </div>
)}
```

---

### PART E — Environment Variables Check

#### 13. Verify all env vars work

Create `src/app/api/health/route.ts`:
```typescript
export async function GET() {
  const checks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    upi_id: !!process.env.NEXT_PUBLIC_UPI_ID,
    site_url: !!process.env.NEXT_PUBLIC_SITE_URL,
  }
  const allGood = Object.values(checks).every(Boolean)
  return Response.json({ status: allGood ? 'ok' : 'missing_env', checks })
}
```

Visit http://localhost:3000/api/health — all should be `true`.

---

### PART F — Final Testing Checklist

Run through this entire flow before deploying:

**USER FLOW:**
[ ] Register new account
[ ] Login → redirects to home
[ ] Browse landing page — categories, bestsellers load
[ ] Click category → product listing shows filtered
[ ] Search for a product → results update
[ ] Open product detail — price, qty stepper, add to cart work
[ ] Cart badge updates
[ ] Go to cart — items show correctly
[ ] Proceed to checkout
[ ] Add new address — city dropdown shows only active cities
[ ] Select UPI → proceed to payment
[ ] QR code appears, timer counts down
[ ] Submit UTR → order moves to awaiting_verification
[ ] Go to My Orders → order appears
[ ] Go to Track Order → stepper shows current status

**ADMIN FLOW:**
[ ] Login as admin → redirects to /admin
[ ] Dashboard shows today's stats
[ ] Add a product with image upload
[ ] Product appears in user-facing shop
[ ] View the order from user flow above
[ ] UPI verification pending alert shows
[ ] Click Verify Payment → order moves to confirmed
[ ] Go to user's tracking page → stepper advances to "Confirmed" (realtime)
[ ] Advance order to "Packed"
[ ] Advance to "Out for Delivery"
[ ] User tracking page shows each change
[ ] Add a new city → appears in checkout dropdown
[ ] Deactivate a city → disappears from checkout

**EDGE CASES:**
[ ] Try to checkout with empty cart → redirected to /cart
[ ] Try to access /admin as a regular user → redirected to /login
[ ] Try to access /checkout without login → redirected to /login with next param
[ ] UPI timer expires → order auto-cancelled
[ ] Out-of-stock product in cart → blocked from checkout

---

### PART G — Deploy

#### 14. Final pre-deploy steps

```bash
# Clean build
npm run build

# Should show:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# No TypeScript errors, no ESLint errors
```

Fix any errors before deploying.

#### 15. Push to GitHub

```bash
git add .
git commit -m "feat: complete Patel Farsan ordering system"
git push origin main
```

Vercel auto-deploys from main branch.
Watch the build log in Vercel dashboard.

#### 16. Verify Vercel env vars

Go to Vercel → Project Settings → Environment Variables.
Make sure ALL these are set for Production:
- NEXT_PUBLIC_SUPABASE_URL ✓
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✓
- SUPABASE_SERVICE_ROLE_KEY ✓
- NEXT_PUBLIC_SITE_URL (set to your vercel URL, e.g. https://patel-farsan.vercel.app) ✓
- NEXT_PUBLIC_UPI_ID ✓
- NEXT_PUBLIC_SHOP_NAME ✓
- NEXT_PUBLIC_SHOP_PHONE ✓
- NEXT_PUBLIC_SHOP_WHATSAPP ✓

After adding/changing any env var → Redeploy in Vercel dashboard.

#### 17. Update Supabase auth settings

Go to Supabase → Authentication → URL Configuration:
- Site URL: `https://patel-farsan.vercel.app`
- Redirect URLs: `https://patel-farsan.vercel.app/**`

#### 18. Test production

Visit your live URL and run through the full user flow once.
Specifically test:
- Register creates a profile in Supabase
- Login works
- Cart persists across page refreshes
- Order creates correctly
- UPI QR generates with correct amount
- Admin panel accessible with admin account

---

## CONGRATULATIONS 🎉

Patel Farsan is live at `https://patel-farsan.vercel.app`

Total cost: ₹0/month (until scale)
When to upgrade:
- Supabase free limit: 50,000 monthly active users, 500MB DB
- Vercel free limit: 100GB bandwidth/month

When you're ready to grow:
- Add Razorpay for automatic UPI verification (~2% per transaction)
- Add a custom domain: patelfarsan.in (~₹700/year)
- Add WhatsApp Business API for order notifications
- Upgrade Supabase Pro ($25/month) at heavy traffic
