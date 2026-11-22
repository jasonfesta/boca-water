# Boca Water — Stripe Payment Links Setup (Zero Backend)

Boca Water is a **pure static Vite frontend** on Vercel targeting **3 direct Stripe Payment Links** — one each for **1-Pack**, **6-Pack**, and **24-Pack**. No backend server or secret keys are required in the app.

## 1. Environment Variables

Add these 3 public Payment Link URLs to `website/.env.local` (for local dev) and **Vercel → Project Settings → Environment Variables** (with **Root Directory: `website`**):

```bash
VITE_STRIPE_PAYMENT_LINK_1PACK=https://buy.stripe.com/...
VITE_STRIPE_PAYMENT_LINK_6PACK=https://buy.stripe.com/...
VITE_STRIPE_PAYMENT_LINK_24PACK=https://buy.stripe.com/...
```

## 2. Creating the 3 Payment Links in Stripe

Create 3 Payment Links in the **Boca Water** Stripe Dashboard (enable **Let customers adjust quantity** and **Collect shipping address** on each):

| Pack | Cans (12 fl oz / 355 ml) | Price | Env Variable |
| :--- | ---: | ---: | :--- |
| **1-Pack** (Single Can) | 1 | $4.50 | `VITE_STRIPE_PAYMENT_LINK_1PACK` |
| **6-Pack** (The Six-Pack) | 6 | $24.00 | `VITE_STRIPE_PAYMENT_LINK_6PACK` |
| **24-Pack** (The Case) | 24 | $84.00 | `VITE_STRIPE_PAYMENT_LINK_24PACK` |

*(Optional: you can also auto-create all 3 Products, Prices, and Payment Links in one command from your terminal using `STRIPE_SECRET_KEY=sk_test_... node src/commerce/server-example/setup-stripe-products.mjs`.)*

## 3. Deploy on Vercel

1. Import `jasonfesta/boca-water` on Vercel.
2. Set **Root Directory** to `website` (`website/vercel.json` is pre-configured for static Vite SPA).
3. Paste the 3 `VITE_STRIPE_PAYMENT_LINK_*` variables and deploy.
