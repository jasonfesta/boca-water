import {
  PACKS,
  SHOP_CATALOG_LIST,
  type MerchId,
  type PackId,
  type ShopItemId,
} from './catalog';

function readEnv(key: string): string | undefined {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };
  const val = meta.env?.[key]?.trim();
  return val && val.length > 0 ? val : undefined;
}

const DEFAULT_STRIPE_PAYMENT_LINKS: Record<PackId, string> = {
  '1-pack': 'https://buy.stripe.com/dRm14g1g1fz6fGle4u6Vq01',
  '6-pack': 'https://buy.stripe.com/eVq8wI1g1aeM1Pvf8y6Vq00',
  '24-pack': 'https://buy.stripe.com/9B628k4sdgDabq53pQ6Vq02',
};

/**
 * Live verified Stripe Payment Links for BOCA WATER apparel merch:
 * - Shirt ($50.00 — Boca Water T-shirt)
 * - Hat ($50.00 — Boca Raton Hat)
 * - Hoodie ($100.00 — Boca Raton Hoodie)
 */
export const STRIPE_LINK_SHIRT = 'https://buy.stripe.com/dRm4gs9MxdqYgKp5xY6Vq03';
export const STRIPE_LINK_HAT = 'https://buy.stripe.com/3cI5kw0bX0EcfGlbWm6Vq05';
export const STRIPE_LINK_HOODIE = 'https://buy.stripe.com/eVqeV61g1fz6fGl5xY6Vq04';

const DEFAULT_MERCH_STRIPE_LINKS: Record<MerchId, string> = {
  shirt: STRIPE_LINK_SHIRT,
  hat: STRIPE_LINK_HAT,
  hoodie: STRIPE_LINK_HOODIE,
};

const ALL_DEFAULT_STRIPE_LINKS: Record<ShopItemId, string> = {
  ...DEFAULT_STRIPE_PAYMENT_LINKS,
  ...DEFAULT_MERCH_STRIPE_LINKS,
};

/**
 * Returns the configured Stripe Payment Link URL for a water pack tier.
 */
export function resolveStripePaymentLink(packId: PackId): string | undefined {
  return (
    readEnv(PACKS[packId].paymentLinkEnvKey) ??
    DEFAULT_STRIPE_PAYMENT_LINKS[packId]
  );
}

/**
 * Returns the configured Stripe Payment Link URL for any Shop item (water pack or apparel).
 */
export function resolveShopItemStripeLink(itemId: ShopItemId): string | undefined {
  const item = SHOP_CATALOG_LIST.find((entry) => entry.id === itemId);
  return (
    (item ? readEnv(item.paymentLinkEnvKey) : undefined) ??
    ALL_DEFAULT_STRIPE_LINKS[itemId]
  );
}

/**
 * Opens the pack's Stripe Payment Link (`buy.stripe.com`) in a new browser
 * tab/window on both live sites and iframe previews.
 */
export function openStripePaymentLink(packId: PackId): boolean {
  const url = resolveStripePaymentLink(packId);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Opens any Shop item's Stripe Payment Link (`buy.stripe.com`) in a new browser tab.
 */
export function openShopItemStripeLink(itemId: ShopItemId): boolean {
  const url = resolveShopItemStripeLink(itemId);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export function hasAnyStripePaymentLink(): boolean {
  return Boolean(
    resolveStripePaymentLink('1-pack') ||
      resolveStripePaymentLink('6-pack') ||
      resolveStripePaymentLink('24-pack'),
  );
}
