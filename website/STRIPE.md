# Boca Water — Stripe Payment Links Setup (Zero Backend)

Boca Water is a **pure static Vite frontend** on Vercel targeting **3 live Stripe Payment Links** — one each for **1-Pack**, **6-Pack**, and **24-Pack**. No backend server or secret keys are required.

## 1. Live Products, Prices & Payment Links

| Pack | Product Name | Bottles (12 fl oz / 355 ml) | Price | Per Bottle | Savings | Live Stripe Payment Link |
| :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| **1-Pack** | `1 Boca Water` | 1 | **$19.99** | $19.99 | — | `https://buy.stripe.com/dRm14g1g1fz6fGle4u6Vq01` |
| **6-Pack** | `6 pack of Boca Water` | 6 | **$99.99** | $16.67 | 17% | `https://buy.stripe.com/eVq8wI1g1aeM1Pvf8y6Vq00` |
| **24-Pack** | `24 case of Boca Water` | 24 | **$199.99** | $8.33 | 58% | `https://buy.stripe.com/9B628k4sdgDabq53pQ6Vq02` |

## 2. Environment Variable Overrides (Optional)

The live URLs above are wired as defaults in `src/commerce/stripeClient.ts`. To override them per environment in `website/.env.local` or **Vercel → Project Settings → Environment Variables** (**Root Directory: `website`**):

```bash
VITE_STRIPE_PAYMENT_LINK_1PACK=https://buy.stripe.com/dRm14g1g1fz6fGle4u6Vq01
VITE_STRIPE_PAYMENT_LINK_6PACK=https://buy.stripe.com/eVq8wI1g1aeM1Pvf8y6Vq00
VITE_STRIPE_PAYMENT_LINK_24PACK=https://buy.stripe.com/9B628k4sdgDabq53pQ6Vq02
```

## 3. Deploy on Vercel

1. Import `jasonfesta/boca-water` on Vercel.
2. Set **Root Directory** to `website` (`website/vercel.json` is pre-configured for static Vite SPA).
3. Deploy — all 3 packs route directly to their verified `buy.stripe.com` checkout pages.
