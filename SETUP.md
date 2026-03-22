# Letter — Setup Guide

## 1. Supabase

1. Create a new Supabase project at supabase.com
2. Go to **SQL Editor** → run `supabase/migrations/001_initial_schema.sql`
3. Enable **pg_cron** extension: Database → Extensions → pg_cron
4. Enable **pg_net** extension (for HTTP calls from pg_cron)
5. Run `supabase/migrations/002_pg_cron_delivery.sql`
6. Set your project URL and anon key in `.env`:
   ```
   PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJh...
   ```
7. In Supabase Auth settings → Email → enable **Magic Link**
8. Set your site URL and redirect URLs (e.g. `https://letter.app`, `https://letter.app/auth/callback`)

### Edge Functions

Deploy the two Edge Functions:
```bash
npx supabase functions deploy generate-letter
npx supabase functions deploy deliver-letters
```

Set secrets for the Edge Functions:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=your-key
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

## 2. Stripe (keys arriving tomorrow)

1. Create a product: **Letter** — $6.00/month recurring
2. Copy the price ID → update `src/lib/stripe.ts`:
   ```ts
   export const STRIPE_PRICE_MONTHLY = 'price_xxxxxxxxxxxx';
   ```
3. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. In Stripe dashboard → Webhooks → add endpoint:
   `https://letter.app/api/stripe/webhook`
   Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## 3. Vercel

1. Connect GitHub repo at vercel.com/new
2. Framework preset: **SvelteKit** (auto-detected)
3. Add all env vars from `.env.example`
4. Deploy

## 4. Icons

Add PWA icons to `static/icons/`:
- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `apple-touch-icon.png` — 180×180 (in `static/`)

Use `#0d0c0b` background, Lora "L" in `#f5f0e8`.

## 5. Domain

Point your domain DNS to Vercel. Set the `origin` in Supabase Auth settings.

---

That's it. Sunday at 8am in each user's timezone, Nia writes.
