# 00 — Secrets & Credentials Setup
# Get ALL of these BEFORE running any build prompt

This file tells you every external account you need,
exactly where to get each value, and where to paste it.
Do this once. Takes about 30 minutes total.

---

## STEP 1 — GitHub (5 min)

1. Go to https://github.com and create a free account
2. Click "New repository"
3. Name it: `patel-farsan`
4. Set to Public (or Private — both work with Vercel free)
5. Click "Create repository"
6. Copy the repo URL — looks like:
   `https://github.com/YOUR_USERNAME/patel-farsan`

**You need:** Nothing to paste yet. Just the repo exists.

---

## STEP 2 — Supabase (10 min)

### 2a. Create project
1. Go to https://supabase.com
2. Sign up with GitHub (easiest)
3. Click "New Project"
4. Organization: your personal org
5. Project name: `patel-farsan`
6. Database password: create a strong one, **save it somewhere safe**
7. Region: `South Asia (Mumbai)` — closest to Gujarat
8. Click "Create new project" — wait 2 minutes

### 2b. Get your keys
Once project is ready:
1. Go to **Settings → API** (left sidebar)
2. Copy these three values:

```
NEXT_PUBLIC_SUPABASE_URL=
(looks like: https://abcdefgh.supabase.co)

NEXT_PUBLIC_SUPABASE_ANON_KEY=
(long string starting with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)

SUPABASE_SERVICE_ROLE_KEY=
(another long string — keep this SECRET, never expose in frontend)
```

### 2c. Enable Email Auth
1. Go to **Authentication → Providers**
2. Make sure "Email" is enabled (it is by default)
3. Turn OFF "Confirm email" toggle — easier for testing
   (you can turn it back on before going live)

### 2d. Create Storage bucket
1. Go to **Storage** in left sidebar
2. Click "New bucket"
3. Name: `product-images`
4. Toggle: **Public bucket** ON
5. Click "Save"

---

## STEP 3 — Vercel (5 min)

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your `patel-farsan` GitHub repo
5. Framework: Next.js (auto-detected)
6. Click "Deploy" — it will fail (no code yet) but that's fine
7. Go to your project → **Settings → Environment Variables**
8. Add these one by one (you'll fill values from above):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `NEXT_PUBLIC_SITE_URL` | `https://patel-farsan.vercel.app` |
| `NEXT_PUBLIC_UPI_ID` | your UPI ID (e.g. `yourname@okaxis`) |
| `NEXT_PUBLIC_SHOP_NAME` | `Patel Farsan` |

---

## STEP 4 — Your UPI ID (2 min)

This is your existing UPI ID — same one you use for GPay/PhonePe.
- Open GPay or PhonePe
- Go to Profile → Your UPI IDs
- Copy it (looks like: `name@okaxis` or `9876543210@ybl`)
- Paste it as `NEXT_PUBLIC_UPI_ID` in Vercel above

---

## STEP 5 — Resend Email (5 min) [OPTIONAL]

Only needed if you want order confirmation emails.
If you skip this, orders still work — just no emails.

1. Go to https://resend.com
2. Sign up free (3000 emails/month free)
3. Go to **API Keys → Create API Key**
4. Name: `patel-farsan`
5. Copy the key (starts with `re_`)
6. Add to Vercel env vars:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | `orders@patelfarsan.in` (or any email) |

---

## STEP 6 — Your .env.local file

Create this file at the ROOT of your project folder.
**Never commit this file to GitHub** (it's in .gitignore already).

```bash
# .env.local
# Copy-paste your values here

NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_UPI_ID=yourname@okaxis
NEXT_PUBLIC_SHOP_NAME=Patel Farsan
NEXT_PUBLIC_SHOP_PHONE=+919876543210
NEXT_PUBLIC_SHOP_WHATSAPP=919876543210

# Optional
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=orders@patelfarsan.in
```

---

## FINAL CHECKLIST before you start building

- [ ] GitHub repo created: `patel-farsan`
- [ ] Supabase project created, keys copied
- [ ] Supabase Storage bucket `product-images` created (public)
- [ ] Vercel project created, all env vars added
- [ ] `.env.local` file created locally with all values
- [ ] Your UPI ID confirmed and added

Once all boxes are checked → open `01-PROJECT-SETUP.md`
