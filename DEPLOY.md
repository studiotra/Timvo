# Deploy Timvo Invoice App to Vercel

This guide walks you through deploying the app to Vercel (free tier).

## Prerequisites

1. **GitHub account** – push your code to a GitHub repository
2. **Vercel account** – sign up at [vercel.com](https://vercel.com) (free)
3. **Supabase project** – already set up
4. **Stripe account** – for payments
5. **Resend account** – for invoice emails

---

## Step 1: Push code to GitHub

If you haven’t already:

```bash
cd "/Users/petrahwang/Library/CloudStorage/GoogleDrive-studiotra.petra@gmail.com/My Drive/Invoice Web App"

git init
git add .
git commit -m "Initial commit"
```

Create a new repo on [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/studiotra/Timvo.git
git branch -M main
git push -u origin main
```

> **Note:** Don’t commit `.env.local` – it should be in `.gitignore`. You’ll add env vars in Vercel.

---

## Step 2: Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repository
3. **Configure:**
   - Framework: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Click **Deploy** – the first deploy may fail if env vars are missing. Add them next.

---

## Step 3: Add Environment Variables

In your Vercel project → **Settings** → **Environment Variables**, add:

| Name | Value | Notes |
|------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Same place |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Same place (keep secret) |
| `RESEND_API_KEY` | Your Resend API key | Resend dashboard |
| `EMAIL_FROM` | e.g. `invoices@yourdomain.com` | Must be verified in Resend |
| `STRIPE_SECRET_KEY` | Your Stripe secret key | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Set after adding webhook (see below) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `OPENAI_API_KEY` | (optional) | Only if using AI features |

Add each variable for **Production**, **Preview**, and **Development** as needed.

---

## Step 4: Redeploy

After adding env vars: **Deployments** → **⋯** on latest deploy → **Redeploy**.

---

## Step 5: Post-deploy configuration

### Supabase – Auth redirect URLs

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL, e.g. `https://timvo.work` or `https://www.timvo.work`
3. Add to **Redirect URLs** (include both if you use www):
   - `https://timvo.work/**`
   - `https://www.timvo.work/**`
4. Ensure the URL matches how users reach your site (www vs non-www) so auth cookies work

### Stripe – Webhook for production

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`
3. Events: `checkout.session.completed` (and any others you use)
4. Copy the **Signing secret** (`whsec_...`)
5. Add it in Vercel as `STRIPE_WEBHOOK_SECRET` and redeploy

### Resend – Domain (optional)

To send from your own domain (e.g. `invoices@yourdomain.com`):

1. Resend → **Domains** → **Add Domain**
2. Add the DNS records they provide
3. Use `EMAIL_FROM=invoices@yourdomain.com` in Vercel

For testing, a Resend default domain is fine (e.g. `onboarding@resend.dev`).

---

## Step 6: Custom domain (optional)

1. Vercel project → **Settings** → **Domains**
2. Add your domain (e.g. `invoicing.yourdomain.com`)
3. Add the DNS records Vercel shows at your registrar

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Build fails | Check build logs; fix TypeScript/lint errors locally first |
| 500 on auth | Ensure Supabase URL, redirect URLs, and env vars are correct |
| Accept-invite "Not authenticated" | Add both `https://timvo.work/**` and `https://www.timvo.work/**` to Supabase Redirect URLs; ensure Site URL matches your domain |
| Invite emails not sending | Verify RESEND_API_KEY and EMAIL_FROM. Resend free tier: send only to your account email until you add a domain at resend.com/domains |
| Magic link / forgot password emails not sending | Configure custom SMTP in Supabase Auth, or add your domain to Supabase’s allowed redirect URLs |
| Stripe webhook fails | Confirm `STRIPE_WEBHOOK_SECRET` and endpoint URL are correct |
| Emails not sending | Verify Resend API key, `EMAIL_FROM`, and domain status |
| Client invite shows "Check your email" but no confirmation email | Fixed in code: invite flow now creates users server-side with `email_confirm: true`, so no Supabase auth email is needed. Supabase's default email only sends to org team addresses. |
| Blank page / hydration errors | Clear cache and redeploy; check browser console for errors |

---

## Quick checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created and linked to repo
- [ ] All env vars added in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` set to the live Vercel URL
- [ ] Supabase redirect URLs updated
- [ ] Stripe webhook added and signing secret set
- [ ] Redeployed after env/config changes
