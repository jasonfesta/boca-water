#!/usr/bin/env node
/**
 * Optional zero-dependency helper to create Boca Water's 3 Stripe Products,
 * Prices, and direct Stripe Payment Links in one command.
 *
 * Run locally (never commit STRIPE_SECRET_KEY):
 *   STRIPE_SECRET_KEY=sk_test_... node src/commerce/server-example/setup-stripe-products.mjs
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim();

if (!STRIPE_SECRET_KEY) {
  console.error(
    'Error: STRIPE_SECRET_KEY is required.\n' +
      'Usage: STRIPE_SECRET_KEY=sk_test_... node src/commerce/server-example/setup-stripe-products.mjs',
  );
  process.exit(1);
}

const PRODUCTS = [
  {
    packId: '1-pack',
    envSuffix: '1PACK',
    name: 'Boca Sparkling Water — Single Can',
    description:
      '1 × 12 fl oz (355 ml) crystal-clear PET can of Boca Sparkling Water.',
    unitAmountCents: 450,
    sku: 'BOCA-SPK-355-01',
  },
  {
    packId: '6-pack',
    envSuffix: '6PACK',
    name: 'Boca Sparkling Water — 6-Pack',
    description:
      '6 × 12 fl oz (355 ml) crystal-clear PET cans of Boca Sparkling Water.',
    unitAmountCents: 2400,
    sku: 'BOCA-SPK-355-06',
  },
  {
    packId: '24-pack',
    envSuffix: '24PACK',
    name: 'Boca Sparkling Water — The Case (24-Pack)',
    description:
      '24 × 12 fl oz (355 ml) crystal-clear PET cans in a reinforced presentation case.',
    unitAmountCents: 8400,
    sku: 'BOCA-SPK-355-24',
  },
];

async function stripePost(path, params) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Stripe ${path} failed (${response.status}): ${data?.error?.message || JSON.stringify(data)}`,
    );
  }
  return data;
}

async function main() {
  const mode = STRIPE_SECRET_KEY.startsWith('sk_live_')
    ? 'LIVE'
    : 'TEST/SANDBOX';
  console.log(
    `\nCreating Boca Water's 3 Stripe Payment Links (${mode})...\n`,
  );

  const createdLinks = {};

  for (const item of PRODUCTS) {
    const product = await stripePost('/v1/products', {
      name: item.name,
      description: item.description,
      'metadata[pack_id]': item.packId,
      'metadata[sku]': item.sku,
    });

    const price = await stripePost('/v1/prices', {
      product: product.id,
      unit_amount: String(item.unitAmountCents),
      currency: 'usd',
      nickname: item.packId,
      'metadata[pack_id]': item.packId,
    });

    const paymentLink = await stripePost('/v1/payment_links', {
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': '1',
      'line_items[0][adjustable_quantity][enabled]': 'true',
      'line_items[0][adjustable_quantity][minimum]': '1',
      'line_items[0][adjustable_quantity][maximum]': '24',
      'shipping_address_collection[allowed_countries][0]': 'US',
      'shipping_address_collection[allowed_countries][1]': 'CA',
      'metadata[pack_id]': item.packId,
    });

    createdLinks[item.envSuffix] = paymentLink.url;
    console.log(
      `  ✓ ${item.name} ($${(item.unitAmountCents / 100).toFixed(2)}) -> ${paymentLink.url}`,
    );
  }

  console.log('\nPaste these 3 variables into website/.env.local or Vercel:');
  console.log(`VITE_STRIPE_PAYMENT_LINK_1PACK=${createdLinks['1PACK']}`);
  console.log(`VITE_STRIPE_PAYMENT_LINK_6PACK=${createdLinks['6PACK']}`);
  console.log(`VITE_STRIPE_PAYMENT_LINK_24PACK=${createdLinks['24PACK']}\n`);
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
