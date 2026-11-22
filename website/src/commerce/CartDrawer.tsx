import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { PACK_LIST, formatCurrency, type PackId } from './catalog';
import { useCart } from './CartContext';
import { openStripePaymentLink } from './stripeClient';

function VesselGlyph() {
  return (
    <svg
      viewBox="0 0 28 56"
      fill="none"
      aria-hidden="true"
      className="h-10 w-5 text-[#f6f5f1]/80 shrink-0"
    >
      <path
        d="M9 5.5H19"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M9 5.5L7 9.5V48.5C7 51.8 9.4 53.8 14 53.8C18.6 53.8 21 51.8 21 48.5V9.5L19 5.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M9.5 52C11.2 49.8 16.8 49.8 18.5 52"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />
      <path
        d="M8.5 14C11 13.3 17 13.3 19.5 14"
        stroke="#7eb6bf"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="12" cy="27" r="0.9" fill="#7eb6bf" opacity="0.7" />
      <circle cx="15.8" cy="34" r="0.75" fill="#7eb6bf" opacity="0.55" />
      <circle cx="13.2" cy="42" r="1" fill="#7eb6bf" opacity="0.65" />
    </svg>
  );
}

export function CartDrawer() {
  const { selectedPackId, setSelectedPackId, isDrawerOpen, closeDrawer } =
    useCart();
  const [missingLinkEnvKey, setMissingLinkEnvKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isDrawerOpen) {
      setMissingLinkEnvKey(null);
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  const handleCheckoutPack = (packId: PackId, envKey: string) => {
    setSelectedPackId(packId);
    const redirected = openStripePaymentLink(packId);
    if (!redirected) {
      setMissingLinkEnvKey(envKey);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${
        isDrawerOpen
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isDrawerOpen}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={closeDrawer}
      />

      {/* Slide-over Quick Order Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Order Boca Sparkling Water"
        className={`relative z-10 flex h-full w-full max-w-[420px] flex-col bg-[#0a0b0e] text-[#f6f5f1] shadow-[-24px_0_80px_rgba(0,0,0,0.65)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f6f5f1]/[0.08]">
          <div>
            <h2 className="text-[18px] font-medium tracking-[-0.015em]">
              Order Boca
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#f6f5f1]/50">
              Choose a pack to continue to Stripe Checkout
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close order drawer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f5f1]/[0.06] hover:bg-[#f6f5f1]/[0.12] pt-[2px] text-[#f6f5f1]/80 hover:text-[#f6f5f1] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
          {PACK_LIST.map((pack) => {
            const isSelected = pack.id === selectedPackId;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() =>
                  handleCheckoutPack(pack.id, pack.paymentLinkEnvKey)
                }
                className={`group flex w-full items-center gap-4 rounded-2xl px-4 pt-[16px] pb-[14px] text-left transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? 'bg-[#f6f5f1]/[0.10] ring-1 ring-[#f6f5f1]/40'
                    : 'bg-[#f6f5f1]/[0.04] hover:bg-[#f6f5f1]/[0.08]'
                }`}
              >
                <div className="flex h-14 w-11 items-center justify-center rounded-xl bg-[#f6f5f1]/[0.05]">
                  <VesselGlyph />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-[#f6f5f1]">
                      {pack.shortName} · {pack.name}
                    </span>
                    {pack.savingsPercent > 0 && (
                      <span className="text-[11px] font-medium text-[#7eb6bf] tabular-nums">
                        Save {pack.savingsPercent}%
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[#f6f5f1]/52 tabular-nums">
                    {pack.bottleCount}{' '}
                    {pack.bottleCount === 1 ? 'can' : 'cans'} (12 fl oz) ·{' '}
                    {formatCurrency(pack.pricePerBottleCents)} each
                  </p>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <span className="text-[15px] font-medium text-[#f6f5f1] tabular-nums">
                    {formatCurrency(pack.priceCents)}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-[#f6f5f1]/45 group-hover:text-[#f6f5f1] transition-colors" />
                </div>
              </button>
            );
          })}

          {missingLinkEnvKey && (
            <p className="rounded-xl bg-[#f6f5f1]/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-[#f6f5f1]/68">
              Stripe Checkout link pending — add{' '}
              <code className="text-[#f6f5f1]">{missingLinkEnvKey}</code> in{' '}
              <code className="text-[#f6f5f1]">.env.local</code> or Vercel to
              open this pack&apos;s Stripe page directly.
            </p>
          )}
        </div>

        <div className="border-t border-[#f6f5f1]/[0.08] px-6 py-4 text-[12px] text-[#f6f5f1]/45">
          Quantity, shipping, and tax are completed directly on Stripe Checkout.
        </div>
      </aside>
    </div>
  );
}
