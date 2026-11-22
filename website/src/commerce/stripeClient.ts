import { PACKS, type PackId } from './catalog';

function readEnv(key: string): string | undefined {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };
  const val = meta.env?.[key]?.trim();
  return val && val.length > 0 ? val : undefined;
}

const DEFAULT_STRIPE_PAYMENT_LINKS: Record<PackId, string> = {
  '1-pack': 'https://buy.stripe.com/dRm14g1g1fz6fGle4u6Vq01',
  '6-pack': 'https://buy.stripe.com/9B628k4sdgDabq53pQ6Vq02',
  '24-pack': 'https://buy.stripe.com/eVq8wI1g1aeM1Pvf8y6Vq00',
};

/**
 * Returns the configured Stripe Payment Link URL for a pack tier.
 * Reads `.env.local` / Vercel Environment Variables first, falling back to
 * the live Boca Water Stripe Payment Links:
 *   - VITE_STRIPE_PAYMENT_LINK_1PACK
 *   - VITE_STRIPE_PAYMENT_LINK_6PACK
 *   - VITE_STRIPE_PAYMENT_LINK_24PACK
 */
export function resolveStripePaymentLink(packId: PackId): string | undefined {
  return (
    readEnv(PACKS[packId].paymentLinkEnvKey) ??
    DEFAULT_STRIPE_PAYMENT_LINKS[packId]
  );
}

/**
 * Advances directly to the pack's Stripe Payment Link (`buy.stripe.com`).
 * Opens in a new tab when embedded inside an iframe preview; navigates directly
 * when running top-level on the live site.
 */
export function openStripePaymentLink(packId: PackId): boolean {
  const url = resolveStripePaymentLink(packId);
  if (!url) return false;
  if (window.top !== window.self) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.assign(url);
  }
  return true;
}

export function hasAnyStripePaymentLink(): boolean {
  return Boolean(
    resolveStripePaymentLink('1-pack') ||
      resolveStripePaymentLink('6-pack') ||
      resolveStripePaymentLink('24-pack'),
  );
}
