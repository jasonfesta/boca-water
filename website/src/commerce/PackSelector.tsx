import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  PACK_LIST,
  formatCurrency,
  getPackById,
  type PackId,
} from './catalog';
import { useCart } from './CartContext';
import { openStripePaymentLink } from './stripeClient';

export interface PackSelectorProps {
  className?: string;
  /** Controlled expanded state synced with 3D pack puff-out/unravel */
  packExpanded?: boolean;
  /** Fires whenever the active pack tier changes (1-pack | 6-pack | 24-pack) */
  onPackChange?: (packId: PackId) => void;
  /** Fires when user taps a pack tile to inspect/puff-out in 3D, or returns to pack overview */
  onPackExpandChange?: (expanded: boolean) => void;
}

const STAGE_SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 30,
  mass: 0.9,
};

function PackFormationGlyph({ packId }: { packId: PackId }) {
  if (packId === '1-pack') {
    return (
      <svg
        viewBox="0 0 36 44"
        fill="none"
        aria-hidden="true"
        className="h-10 w-8 text-[#f6f5f1]/85"
      >
        <path
          d="M14 5L12.5 8.5V36C12.5 38.4 14.3 40 18 40C21.7 40 23.5 38.4 23.5 36V8.5L22 5H14Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M14 13C15.8 12.4 20.2 12.4 22 13"
          stroke="#7eb6bf"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (packId === '6-pack') {
    return (
      <svg
        viewBox="0 0 48 44"
        fill="none"
        aria-hidden="true"
        className="h-10 w-11 text-[#f6f5f1]/85"
      >
        {[10, 20, 30].map((x) => (
          <g key={x} opacity="0.42">
            <rect
              x={x}
              y="6"
              width="7"
              height="24"
              rx="2.2"
              stroke="currentColor"
              strokeWidth="1.1"
            />
          </g>
        ))}
        {[13, 23, 33].map((x) => (
          <g key={`f-${x}`}>
            <rect
              x={x}
              y="12"
              width="7.5"
              height="26"
              rx="2.4"
              fill="#0b0c0f"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d={`M${x + 1.5} 18H${x + 6}`}
              stroke="#7eb6bf"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 56 44"
      fill="none"
      aria-hidden="true"
      className="h-10 w-13 text-[#f6f5f1]/85"
    >
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4, 5].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={8 + col * 8}
            cy={10 + row * 8}
            r="2.4"
            stroke="currentColor"
            strokeWidth="1.1"
            opacity={0.45 + row * 0.16}
          />
        )),
      )}
    </svg>
  );
}

export function PackSelector({
  className = '',
  packExpanded: controlledExpanded,
  onPackChange,
  onPackExpandChange,
}: PackSelectorProps) {
  const { selectedPackId, setSelectedPackId } = useCart();

  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  const [missingLinkEnvKey, setMissingLinkEnvKey] = useState<string | null>(
    null,
  );

  // Fish-eye / magnetic proximity state across the 3 pack tiles
  const gridRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Record<PackId, HTMLButtonElement | null>>({
    '1-pack': null,
    '6-pack': null,
    '24-pack': null,
  });
  const [tileScales, setTileScales] = useState<
    Record<PackId, { scale: number; y: number; active: boolean }>
  >({
    '1-pack': { scale: 1, y: 0, active: false },
    '6-pack': { scale: 1, y: 0, active: false },
    '24-pack': { scale: 1, y: 0, active: false },
  });

  const activePack = getPackById(selectedPackId);
  const totalSavingsCents = activePack.compareAtCents
    ? activePack.compareAtCents - activePack.priceCents
    : 0;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (controlledExpanded === undefined) {
        setInternalExpanded(next);
      }
      onPackExpandChange?.(next);
    },
    [controlledExpanded, onPackExpandChange],
  );

  useEffect(() => {
    setMissingLinkEnvKey(null);
    if (!isExpanded) {
      setTileScales({
        '1-pack': { scale: 1, y: 0, active: false },
        '6-pack': { scale: 1, y: 0, active: false },
        '24-pack': { scale: 1, y: 0, active: false },
      });
    }
  }, [isExpanded, selectedPackId]);

  const handleGridPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const px = event.clientX;
    const py = event.clientY;
    const next: Record<PackId, { scale: number; y: number; active: boolean }> = {
      '1-pack': { scale: 1, y: 0, active: false },
      '6-pack': { scale: 1, y: 0, active: false },
      '24-pack': { scale: 1, y: 0, active: false },
    };

    for (const pack of PACK_LIST) {
      const el = tileRefs.current[pack.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dist = Math.hypot(px - cx, py - cy);
      const radius = Math.max(rect.width * 1.45, 220);
      const proximity = Math.max(0, 1 - dist / radius);
      const eased = proximity * proximity;
      next[pack.id] = {
        scale: 0.965 + eased * 0.085,
        y: -eased * 5,
        active: proximity > 0.55,
      };
    }
    setTileScales(next);
  };

  const handleGridPointerLeave = () => {
    setTileScales({
      '1-pack': { scale: 1, y: 0, active: false },
      '6-pack': { scale: 1, y: 0, active: false },
      '24-pack': { scale: 1, y: 0, active: false },
    });
  };

  const handleInspectPack = (packId: PackId) => {
    setSelectedPackId(packId);
    setMissingLinkEnvKey(null);
    onPackChange?.(packId);
    setExpanded(true);
  };

  const handleSwitchInInspect = (packId: PackId) => {
    setSelectedPackId(packId);
    setMissingLinkEnvKey(null);
    onPackChange?.(packId);
  };

  const handleStepPack = (direction: -1 | 1) => {
    const idx = PACK_LIST.findIndex((p) => p.id === selectedPackId);
    const nextIdx = (idx + direction + PACK_LIST.length) % PACK_LIST.length;
    handleSwitchInInspect(PACK_LIST[nextIdx].id);
  };

  const handleDirectCheckout = () => {
    const redirected = openStripePaymentLink(selectedPackId);
    if (!redirected) {
      setMissingLinkEnvKey(activePack.paymentLinkEnvKey);
    }
  };

  return (
    <div
      className={`w-full max-w-[560px] rounded-2xl bg-[#0a0b0e]/88 backdrop-blur-2xl p-6 sm:p-8 text-[#f6f5f1] shadow-[0_28px_90px_rgba(0,0,0,0.65)] ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isExpanded ? (
          /* STAGE 1: Tactile Fish-Eye Pack Selection */
          <motion.div
            key="pack-browse"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={STAGE_SPRING}
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl sm:text-[28px] font-medium tracking-[-0.02em] text-[#f6f5f1]">
                Select a Pack
              </h2>
              <span className="text-sm text-[#f6f5f1]/52 tabular-nums whitespace-nowrap">
                12 fl oz · 355 ml
              </span>
            </div>

            <p className="mt-2 text-[14px] leading-relaxed text-[#f6f5f1]/58">
              Tap any format to unfold the crystal-clear PET cans in 3D and
              continue straight to Stripe Checkout.
            </p>

            <div
              ref={gridRef}
              onPointerMove={handleGridPointerMove}
              onPointerLeave={handleGridPointerLeave}
              className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {PACK_LIST.map((pack) => {
                const isSelected = pack.id === selectedPackId;
                const phys = tileScales[pack.id];

                return (
                  <motion.button
                    key={pack.id}
                    ref={(el) => {
                      tileRefs.current[pack.id] = el;
                    }}
                    type="button"
                    onClick={() => handleInspectPack(pack.id)}
                    onMouseEnter={() => {
                      if (pack.id !== selectedPackId) {
                        setSelectedPackId(pack.id);
                        onPackChange?.(pack.id);
                      }
                    }}
                    animate={{
                      scale: phys.scale,
                      y: phys.y,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 340,
                      damping: 26,
                      mass: 0.7,
                    }}
                    className={`group relative flex flex-col items-start justify-between text-left rounded-xl px-4 pt-[18px] pb-[16px] transition-colors duration-200 cursor-pointer active:scale-[0.97] ${
                      isSelected || phys.active
                        ? 'bg-[#f6f5f1]/[0.11] ring-1 ring-[#f6f5f1]/45 text-[#f6f5f1]'
                        : 'bg-[#f6f5f1]/[0.045] hover:bg-[#f6f5f1]/[0.085] text-[#f6f5f1]/82'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-[15px] font-medium tracking-[-0.01em] text-[#f6f5f1]">
                        {pack.shortName}
                      </span>
                      {pack.savingsPercent > 0 && (
                        <span className="text-[11px] font-medium text-[#7eb6bf] tabular-nums whitespace-nowrap">
                          Save {pack.savingsPercent}%
                        </span>
                      )}
                    </div>

                    <div className="my-4 flex h-11 w-full items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                      <PackFormationGlyph packId={pack.id} />
                    </div>

                    <div className="w-full">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[20px] font-medium tracking-[-0.02em] text-[#f6f5f1] tabular-nums">
                          {formatCurrency(pack.priceCents)}
                        </span>
                        {pack.compareAtCents && (
                          <span className="text-[11.5px] text-[#f6f5f1]/36 line-through tabular-nums">
                            {formatCurrency(pack.compareAtCents)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[12px] text-[#f6f5f1]/52 tabular-nums">
                        <span>
                          {formatCurrency(pack.pricePerBottleCents)} / can
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#f6f5f1]/80" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between text-[12.5px] text-[#f6f5f1]/48">
              <span>Quantity adjustable on Stripe Checkout</span>
              <span className="tabular-nums text-[#f6f5f1]/38">
                Tap to unfold
              </span>
            </div>
          </motion.div>
        ) : (
          /* STAGE 2: Click-to-Inspect -> Direct Stripe Payment Link */
          <motion.div
            key="pack-inspect"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={STAGE_SPRING}
          >
            {/* Top Bar: Back to packs + Pack switcher */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f6f5f1]/[0.06] hover:bg-[#f6f5f1]/[0.12] px-3.5 pt-[8px] pb-[6px] text-[12.5px] font-medium text-[#f6f5f1]/80 hover:text-[#f6f5f1] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 -mt-[2px]" />
                <span>All Packs</span>
              </button>

              <div className="inline-flex items-center gap-1 rounded-full bg-[#f6f5f1]/[0.05] p-1">
                {PACK_LIST.map((pack) => {
                  const active = pack.id === selectedPackId;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => handleSwitchInInspect(pack.id)}
                      className={`rounded-full px-3 pt-[6px] pb-[4px] text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#f6f5f1] text-[#060607]'
                          : 'text-[#f6f5f1]/62 hover:text-[#f6f5f1]'
                      }`}
                    >
                      {pack.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Pack Heading & Price */}
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-[28px] font-medium tracking-[-0.02em] text-[#f6f5f1]">
                  {activePack.name}
                </h2>
                <p className="mt-1 text-[13px] text-[#7eb6bf] inline-flex items-center gap-1.5 tabular-nums">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {activePack.bottleCount}{' '}
                    {activePack.bottleCount === 1 ? 'can' : 'cans'} ·{' '}
                    {formatCurrency(activePack.pricePerBottleCents)} each
                  </span>
                </p>
              </div>

              <div className="text-right">
                <div className="text-[24px] font-medium tracking-[-0.02em] text-[#f6f5f1] tabular-nums">
                  {formatCurrency(activePack.priceCents)}
                </div>
                {activePack.compareAtCents && (
                  <div className="text-[12px] text-[#f6f5f1]/40 line-through tabular-nums">
                    {formatCurrency(activePack.compareAtCents)}
                  </div>
                )}
              </div>
            </div>

            <p className="mt-3 text-[14px] leading-relaxed text-[#f6f5f1]/62">
              {activePack.description}
            </p>

            {/* Pack Summary Row */}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#f6f5f1]/[0.04] px-4 py-3.5 text-[13px]">
              <span className="text-[#f6f5f1]/65 tabular-nums">
                {activePack.bottleCount}{' '}
                {activePack.bottleCount === 1 ? 'can' : 'cans'} ·{' '}
                {(activePack.bottleCount * 0.355).toFixed(2)} L total
              </span>
              {totalSavingsCents > 0 ? (
                <span className="text-[#7eb6bf] tabular-nums">
                  Saving {formatCurrency(totalSavingsCents)} vs. singles
                </span>
              ) : (
                <span className="text-[#f6f5f1]/45">12 fl oz crystal PET</span>
              )}
            </div>

            {/* Direct Stripe Checkout CTA */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleDirectCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f6f5f1] hover:bg-[#e8e6df] active:scale-[0.985] px-6 pt-[14px] pb-[12px] text-[14.5px] font-medium text-[#060607] transition-all duration-150 cursor-pointer whitespace-nowrap"
              >
                <span className="tabular-nums">
                  Buy {activePack.shortName} —{' '}
                  {formatCurrency(activePack.priceCents)}
                </span>
                <ExternalLink className="h-4 w-4 -mt-[2px]" />
              </button>
            </div>

            {missingLinkEnvKey && (
              <p className="mt-3 rounded-xl bg-[#f6f5f1]/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-[#f6f5f1]/68">
                Stripe Checkout link pending — set{' '}
                <code className="text-[#f6f5f1]">{missingLinkEnvKey}</code> in{' '}
                <code className="text-[#f6f5f1]">.env.local</code> or Vercel to
                open this pack&apos;s Stripe page directly.
              </p>
            )}

            {/* Footer & Pack Step Arrows */}
            <div className="mt-4 flex items-center justify-between gap-3 text-[12.5px] text-[#f6f5f1]/50">
              <span>Adjust quantity &amp; shipping on Stripe Checkout</span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepPack(-1)}
                  aria-label="Previous pack"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f6f5f1]/[0.06] hover:bg-[#f6f5f1]/[0.12] pt-[2px] text-[#f6f5f1]/75 hover:text-[#f6f5f1] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepPack(1)}
                  aria-label="Next pack"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f6f5f1]/[0.06] hover:bg-[#f6f5f1]/[0.12] pt-[2px] text-[#f6f5f1]/75 hover:text-[#f6f5f1] transition-colors cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
