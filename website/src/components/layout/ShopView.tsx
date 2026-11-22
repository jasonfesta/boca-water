import { useState } from 'react';
import { motion } from 'motion/react';
import {
  PACK_LIST,
  formatCurrency,
  openStripePaymentLink,
  resolveStripePaymentLink,
  type PackId,
} from '@/commerce';
import { WaterButton } from '@/components/ui/WaterButton';

const LUXURY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface ShopViewProps {
  selectedPack: PackId;
  packExpanded: boolean;
  onSelectPack: (packId: PackId) => void;
  onToggleExpand: () => void;
}

export function ShopView({
  selectedPack,
  packExpanded,
  onSelectPack,
  onToggleExpand,
}: ShopViewProps) {
  const [noticePack, setNoticePack] = useState<PackId | null>(null);

  const handleCheckout = (packId: PackId) => {
    const link = resolveStripePaymentLink(packId);
    if (link) {
      openStripePaymentLink(packId);
      return;
    }
    setNoticePack(packId);
  };

  return (
    <motion.section
      key="shop-view"
      initial={{ opacity: 0, y: 34 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 1.05, ease: LUXURY_EASE },
      }}
      exit={{
        opacity: 0,
        y: -24,
        transition: { duration: 0.45, ease: LUXURY_EASE },
      }}
      aria-label="Shop Boca Water"
      className="fixed inset-0 z-20 pointer-events-none flex items-center justify-end px-6 sm:px-14 lg:px-20"
    >
      <div className="pointer-events-auto w-full max-w-[460px] flex flex-col gap-6">
        <div>
          <h1 className="kp-glass-title font-ui text-[clamp(44px,5.4vw,72px)] font-semibold leading-[0.95] tracking-[-0.035em]">
            Shop
          </h1>
          <p className="mt-3 font-ui text-[15px] leading-[1.6] text-[#f6f5f1]/66">
            Select a pack to inspect the formation and proceed straight to
            checkout.
          </p>
        </div>

        <div className="flex flex-col divide-y divide-[#f6f5f1]/[0.1]">
          {PACK_LIST.map((pack, idx) => {
            const isSelected = pack.id === selectedPack;
            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.9,
                    delay: 0.14 + idx * 0.12,
                    ease: LUXURY_EASE,
                  },
                }}
                className="flex items-center justify-between gap-4 py-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onToggleExpand();
                    } else {
                      onSelectPack(pack.id);
                    }
                    setNoticePack(null);
                  }}
                  className="flex-1 text-left border-0 bg-transparent px-0 pt-[2px] pb-0 font-ui transition-opacity duration-200 hover:opacity-100"
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-[18px] font-medium tracking-[-0.015em] transition-colors duration-200 ${
                        isSelected ? 'text-[#f6f5f1]' : 'text-[#f6f5f1]/68'
                      }`}
                    >
                      {pack.name}
                    </span>
                    <span className="text-[14px] text-[#f6f5f1]/48 tabular-nums">
                      {formatCurrency(pack.priceCents)}
                    </span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-[#f6f5f1]/46">
                    {pack.bottleCount === 1
                      ? 'Single 12 fl oz crystal-clear PET can'
                      : `${pack.bottleCount} cans, ${formatCurrency(pack.pricePerBottleCents)} per can${
                          isSelected && packExpanded ? ' (expanded)' : ''
                        }`}
                  </p>
                </button>

                <WaterButton
                  label={`Order ${pack.shortName}`}
                  scale={1.08}
                  active={isSelected}
                  onClick={() => handleCheckout(pack.id)}
                />
              </motion.div>
            );
          })}
        </div>

        {noticePack && (
          <p className="font-ui text-[13px] leading-relaxed text-[#f6f5f1]/58">
            Connect Stripe Payment Link env variables for {noticePack} to open
            hosted checkout directly.
          </p>
        )}
      </div>
    </motion.section>
  );
}
