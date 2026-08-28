# 01 — Project Setup
# Paste this entire file into Claude Code

---

## CONTEXT

I am building an online ordering website for "Patel Farsan" — a traditional
Gujarati farsan (Indian snacks/sweets) shop established in 1985.

Tech stack:
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase (auth + database + storage + realtime)
- Hosted on Vercel (free)

---

## YOUR TASK — Stage 1: Complete Project Setup

Do the following steps in order. After each step confirm it works.

### Step 1 — Bootstrap Next.js project

Run this command:
```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

### Step 2 — Install all dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-toast
npm install @radix-ui/react-avatar @radix-ui/react-tabs
npm install lucide-react
npm install qrcode react-qr-code
npm install @types/qrcode
npm install clsx tailwind-merge
npm install class-variance-authority
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install date-fns
npm install sonner
```

### Step 3 — Install shadcn/ui

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral  
- CSS variables: Yes

Then add these components:
```bash
npx shadcn@latest add button input label card badge
npx shadcn@latest add dialog sheet drawer
npx shadcn@latest add select dropdown-menu
npx shadcn@latest add toast tabs avatar
npx shadcn@latest add separator skeleton
npx shadcn@latest add form
```

### Step 4 — Create the full folder structure

Create ALL of these folders and empty index files:

```
src/
├── app/
│   ├── (user)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          ← Landing page
│   │   ├── products/
│   │   │   ├── page.tsx                      ← Product listing
│   │   │   └── [id]/
│   │   │       └── page.tsx                  ← Product detail
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   ├── checkout/
│   │   │   ├── page.tsx
│   │   │   └── payment/
│   │   │       └── [orderId]/
│   │   │           └── page.tsx              ← UPI payment
│   │   ├── order/
│   │   │   └── success/
│   │   │       └── [orderId]/
│   │   │           └── page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx                      ← My orders
│   │   │   └── [orderId]/
│   │   │       └── page.tsx                  ← Order tracking
│   │   └── account/
│   │       └── page.tsx
│   │
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   └── admin/
│   │       ├── page.tsx                      ← Admin dashboard
│   │       ├── products/
│   │       │   └── page.tsx
│   │       ├── orders/
│   │       │   └── page.tsx
│   │       └── cities/
│   │           └── page.tsx
│   │
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── products/
│   │   │   └── route.ts
│   │   ├── cart/
│   │   │   └── route.ts
│   │   ├── orders/
│   │   │   └── route.ts
│   │   ├── cities/
│   │   │   └── route.ts
│   │   └── upload/
│   │       └── route.ts
│   │
│   ├── globals.css
│   └── layout.tsx                            ← Root layout
│
├── components/
│   ├── ui/                                   ← shadcn components (auto-generated)
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Footer.tsx
│   │   └── AdminSidebar.tsx
│   ├── product/
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   └── ProductFilters.tsx
│   ├── cart/
│   │   ├── CartItem.tsx
│   │   └── CartSummary.tsx
│   ├── checkout/
│   │   ├── AddressCard.tsx
│   │   ├── AddressForm.tsx
│   │   └── PaymentSelector.tsx
│   ├── order/
│   │   ├── OrderCard.tsx
│   │   ├── OrderStepper.tsx
│   │   └── UpiPayment.tsx
│   └── shared/
│       ├── OrnamentalDivider.tsx
│       ├── StatusBadge.tsx
│       └── EmptyState.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                         ← Browser client
│   │   ├── server.ts                         ← Server client
│   │   └── middleware.ts
│   ├── utils.ts
│   ├── validations.ts                        ← Zod schemas
│   └── constants.ts
│
├── hooks/
│   ├── useCart.ts
│   ├── useAuth.ts
│   └── useRealtimeOrder.ts
│
├── store/
│   └── cartStore.ts                          ← Zustand cart store
│
└── types/
    └── index.ts                              ← All TypeScript types
```

Create a placeholder `page.tsx` or `route.ts` in each folder
with just a basic export so the build doesn't fail:

```tsx
// placeholder page
export default function Page() {
  return <div>Coming soon</div>
}
```

### Step 5 — Supabase client setup

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

Create `src/middleware.ts` at the root of src:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect user routes
  const protectedPaths = ['/cart', '/checkout', '/orders', '/account']
  if (protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    if (!user) return NextResponse.redirect(new URL('/login?next=' + request.nextUrl.pathname, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Step 6 — TypeScript types

Create `src/types/index.ts` with ALL types:

```typescript
export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  name: string
  phone: string
  email?: string
  role: UserRole
  created_at: string
}

export interface Category {
  id: string
  name: string
  name_gujarati: string
  display_order: number
  is_active: boolean
  image_url?: string
}

export interface Product {
  id: string
  category_id: string
  category?: Category
  name: string
  name_gujarati: string
  description?: string
  image_url?: string
  price: number
  unit: string
  stock_qty: number
  is_available: boolean
  is_featured: boolean
  created_at: string
}

export interface City {
  id: string
  name: string
  delivery_charge: number
  min_order_value: number
  is_active: boolean
}

export interface Address {
  id: string
  user_id: string
  full_name: string
  phone: string
  address_line: string
  area: string
  city_id: string
  city?: City
  pincode: string
  is_default: boolean
}

export type PaymentMode = 'upi' | 'cod'
export type PaymentStatus = 'pending' | 'awaiting_verification' | 'paid' | 'failed'
export type OrderStatus = 
  'awaiting_payment' | 'placed' | 'confirmed' | 
  'packed' | 'out_for_delivery' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  order_number: string
  user_id: string
  profile?: Profile
  address_snapshot: Address
  subtotal: number
  delivery_charge: number
  total: number
  payment_mode: PaymentMode
  payment_status: PaymentStatus
  order_status: OrderStatus
  utr_number?: string
  delivery_instructions?: string
  placed_at: string
  delivered_at?: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_name_gujarati: string
  product_image_url?: string
  price_at_purchase: number
  quantity: number
  line_total: number
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: OrderStatus
  changed_by: string
  changed_at: string
  note?: string
}

export interface CartItem {
  product: Product
  quantity: number
}
```

### Step 7 — Constants file

Create `src/lib/constants.ts`:
```typescript
export const ORDER_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting Payment',
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  awaiting_payment: 'amber',
  placed: 'grey',
  confirmed: 'blue',
  packed: 'amber',
  out_for_delivery: 'orange',
  delivered: 'green',
  cancelled: 'red',
}

export const ADMIN_STATUS_FLOW = [
  'placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered'
]
```

### Step 8 — Tailwind custom config

Update `tailwind.config.ts` to add brand colors:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#5C1A15',
          light: '#7a2219',
          dark: '#3d110e',
        },
        gold: {
          DEFAULT: '#C99A2E',
          light: '#ddb84a',
          dark: '#a67d20',
        },
        cream: {
          DEFAULT: '#FDF1DC',
          dark: '#F5E4C0',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Noto Serif', 'Georgia', 'serif'],
        sans: ['Inter', 'Noto Sans', 'sans-serif'],
        gujarati: ['Noto Sans Gujarati', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### Step 9 — Root layout with Google Fonts

Update `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter, Playfair_Display, Noto_Sans_Gujarati } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })
const gujarati = Noto_Sans_Gujarati({ subsets: ['gujarati'], variable: '--font-gujarati', weight: ['400','600','700'] })

export const metadata: Metadata = {
  title: 'Patel Farsan — Since 1985',
  description: 'Authentic Gujarati farsan, delivered to your door. Fresh daily since 1985.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${gujarati.variable} font-sans bg-cream`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
```

### Step 10 — Globals CSS

Replace `src/app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --maroon: #5C1A15;
    --gold: #C99A2E;
    --cream: #FDF1DC;
    --cream-dark: #F5E4C0;
  }
  
  body {
    @apply bg-cream text-stone-900;
  }
  
  h1, h2, h3 {
    @apply font-serif;
  }
}

@layer components {
  .btn-primary {
    @apply bg-maroon text-white rounded-lg px-4 py-2.5 font-semibold 
           hover:bg-maroon-light transition-colors duration-200
           disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-outline {
    @apply border-2 border-maroon text-maroon bg-transparent rounded-lg 
           px-4 py-2.5 font-semibold hover:bg-maroon hover:text-white 
           transition-colors duration-200;
  }
  
  .card-base {
    @apply bg-white rounded-xl border border-cream-dark shadow-sm;
  }
  
  .card-product {
    @apply card-base border-t-4 border-t-maroon overflow-hidden;
  }
  
  .input-base {
    @apply w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm
           bg-cream focus:outline-none focus:border-maroon focus:ring-1 
           focus:ring-maroon transition-colors;
  }
  
  .section-title {
    @apply font-serif text-maroon font-bold;
  }
  
  .gold-divider {
    @apply flex items-center gap-2 my-3;
  }
  
  .gold-divider::before,
  .gold-divider::after {
    @apply content-[''] flex-1 h-px bg-gold opacity-40;
  }
}
```

### Step 11 — Verify build works

```bash
npm run dev
```

Open http://localhost:3000 — should show "Coming soon" without errors.

```bash
npm run build
```

Should complete with no TypeScript errors.

### Step 12 — Initialize git and push

```bash
git init
git add .
git commit -m "feat: initial project setup"
git remote add origin https://github.com/YOUR_USERNAME/patel-farsan.git
git push -u origin main
```

---

## DONE ✓

Stage 1 complete when:
- `npm run dev` works with no errors
- `npm run build` passes
- Code is pushed to GitHub
- Vercel auto-deploys (may show "Coming soon" — that's fine)

**Next: Open `02-DATABASE.md`**
