export type PackId = '1-pack' | '6-pack' | '24-pack';

export interface PackProduct {
  id: PackId;
  name: string;
  shortName: string;
  bottleCount: number;
  volumeMl: number;
  priceCents: number;
  compareAtCents?: number;
  pricePerBottleCents: number;
  savingsPercent: number;
  description: string;
  sku: string;
  paymentLinkEnvKey:
    | 'VITE_STRIPE_PAYMENT_LINK_1PACK'
    | 'VITE_STRIPE_PAYMENT_LINK_6PACK'
    | 'VITE_STRIPE_PAYMENT_LINK_24PACK';
}

export const FREE_SHIPPING_THRESHOLD_CENTS = 5000; // $50.00
export const SINGLE_BOTTLE_BASE_CENTS = 450; // $4.50

export const PACKS: Record<PackId, PackProduct> = {
  '1-pack': {
    id: '1-pack',
    name: 'Single Can',
    shortName: '1-Pack',
    bottleCount: 1,
    volumeMl: 355,
    priceCents: 450,
    pricePerBottleCents: 450,
    savingsPercent: 0,
    description:
      'One 12 fl oz (355 ml) crystal-clear PET can of fine-bubble Boca Sparkling Water. Ideal for a first pour.',
    sku: 'BOCA-SPK-355-01',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_1PACK',
  },
  '6-pack': {
    id: '6-pack',
    name: 'The Six-Pack',
    shortName: '6-Pack',
    bottleCount: 6,
    volumeMl: 355,
    priceCents: 2400,
    compareAtCents: 2700,
    pricePerBottleCents: 400,
    savingsPercent: 11,
    description:
      'Six 12 fl oz (355 ml) crystal-clear cans chilled-ready for the week. Crisp mineral balance with persistent micro-effervescence.',
    sku: 'BOCA-SPK-355-06',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_6PACK',
  },
  '24-pack': {
    id: '24-pack',
    name: 'The Case',
    shortName: '24-Pack',
    bottleCount: 24,
    volumeMl: 355,
    priceCents: 8400,
    compareAtCents: 10800,
    pricePerBottleCents: 350,
    savingsPercent: 22,
    description:
      'Twenty-four 12 fl oz (355 ml) crystal-clear cans delivered in a reinforced matte presentation case. Includes complimentary shipping.',
    sku: 'BOCA-SPK-355-24',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_24PACK',
  },
};

export const PACK_LIST: PackProduct[] = [
  PACKS['1-pack'],
  PACKS['6-pack'],
  PACKS['24-pack'],
];

export function getPackById(packId: PackId): PackProduct {
  return PACKS[packId];
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
