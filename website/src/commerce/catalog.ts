export type PackId = '1-pack' | '6-pack' | '24-pack';
export type MerchId = 'shirt' | 'hat' | 'hoodie';
export type ShopItemId = PackId | MerchId;

export interface ShopCatalogItem {
  id: ShopItemId;
  title: string;
  priceCents: number;
  category: 'water' | 'merch';
  paymentLinkEnvKey:
    | 'VITE_STRIPE_PAYMENT_LINK_1PACK'
    | 'VITE_STRIPE_PAYMENT_LINK_6PACK'
    | 'VITE_STRIPE_PAYMENT_LINK_24PACK'
    | 'VITE_STRIPE_PAYMENT_LINK_SHIRT'
    | 'VITE_STRIPE_PAYMENT_LINK_HAT'
    | 'VITE_STRIPE_PAYMENT_LINK_HOODIE';
}

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

export const FREE_SHIPPING_THRESHOLD_CENTS = 9900; // $99.00
export const SINGLE_BOTTLE_BASE_CENTS = 1999; // $19.99

export const PACKS: Record<PackId, PackProduct> = {
  '1-pack': {
    id: '1-pack',
    name: '1 Boca Water',
    shortName: '1-Pack',
    bottleCount: 1,
    volumeMl: 355,
    priceCents: 1999,
    pricePerBottleCents: 1999,
    savingsPercent: 0,
    description:
      '1 bottle of Boca Water — cold-sealed 12 fl oz (355 ml) crystal-clear sparkling mineral water with 150 mg L-Theanine and natural silica.',
    sku: 'BOCA-SPK-355-01',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_1PACK',
  },
  '6-pack': {
    id: '6-pack',
    name: '6 pack of Boca Water',
    shortName: '6-Pack',
    bottleCount: 6,
    volumeMl: 355,
    priceCents: 9999,
    compareAtCents: 11994,
    pricePerBottleCents: 1667,
    savingsPercent: 17,
    description:
      '6 bottles of Boca Water — chilled-ready 12 fl oz (355 ml) crystal-clear sparkling mineral water for calm, unhurried clarity all week.',
    sku: 'BOCA-SPK-355-06',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_6PACK',
  },
  '24-pack': {
    id: '24-pack',
    name: '24 case of Boca Water',
    shortName: '24-Pack',
    bottleCount: 24,
    volumeMl: 355,
    priceCents: 19999,
    compareAtCents: 47976,
    pricePerBottleCents: 833,
    savingsPercent: 58,
    description:
      '24 bottles of Boca Water — full presentation case of 12 fl oz (355 ml) crystal-clear sparkling mineral water with our best per-bottle value.',
    sku: 'BOCA-SPK-355-24',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_24PACK',
  },
};

export const PACK_LIST: PackProduct[] = [
  PACKS['1-pack'],
  PACKS['6-pack'],
  PACKS['24-pack'],
];

export const SHOP_CATALOG_LIST: readonly ShopCatalogItem[] = [
  {
    id: '1-pack',
    title: 'Holiday Single',
    priceCents: PACKS['1-pack'].priceCents,
    category: 'water',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_1PACK',
  },
  {
    id: '6-pack',
    title: 'Six-Pack',
    priceCents: PACKS['6-pack'].priceCents,
    category: 'water',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_6PACK',
  },
  {
    id: '24-pack',
    title: 'Case',
    priceCents: PACKS['24-pack'].priceCents,
    category: 'water',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_24PACK',
  },
  {
    id: 'shirt',
    title: 'Shirt',
    priceCents: 5000,
    category: 'merch',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_SHIRT',
  },
  {
    id: 'hat',
    title: 'Hat',
    priceCents: 5000,
    category: 'merch',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_HAT',
  },
  {
    id: 'hoodie',
    title: 'Hoodie',
    priceCents: 10000,
    category: 'merch',
    paymentLinkEnvKey: 'VITE_STRIPE_PAYMENT_LINK_HOODIE',
  },
] as const;

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
