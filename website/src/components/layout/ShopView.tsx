import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  SHOP_CATALOG_LIST,
  formatCurrency,
  openShopItemStripeLink,
  resolveShopItemStripeLink,
  type ShopItemId,
} from '@/commerce';
import { WaterButton } from '@/components/ui/WaterButton';

const LUXURY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface ShopViewProps {
  selectedPack: ShopItemId;
  packExpanded: boolean;
  onSelectPack: (itemId: ShopItemId) => void;
  onToggleExpand: () => void;
  onHoverPack: (itemId: ShopItemId | null) => void;
  onScrollProgress?: (progress: number) => void;
}

declare global {
  interface Window {
    __setBocaShopScroll?: (progress: number) => void;
  }
}

const ALL_SHOP_ITEMS = SHOP_CATALOG_LIST;

export function ShopView({
  selectedPack,
  onSelectPack,
  onHoverPack,
  onScrollProgress,
}: ShopViewProps) {
  const [noticeItem, setNoticeItem] = useState<ShopItemId | null>(null);
  const [localHover, setLocalHover] = useState<ShopItemId | null>(null);
  const hoverRef = useRef<ShopItemId | null>(null);
  const scrollerRef = useRef<HTMLElement>(null);
  const onScrollProgressRef = useRef(onScrollProgress);
  onScrollProgressRef.current = onScrollProgress;

  // Report normalized vertical scroll progress (0..1) and expose __setBocaShopScroll helper
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const publish = () => {
      const maxScroll = Math.max(
        1,
        scroller.scrollHeight - scroller.clientHeight,
      );
      const p = Math.max(0, Math.min(1, scroller.scrollTop / maxScroll));
      onScrollProgressRef.current?.(p);
    };

    window.__setBocaShopScroll = (progress: number) => {
      const clamped = Math.max(0, Math.min(1, progress));
      const maxScroll = Math.max(
        1,
        scroller.scrollHeight - scroller.clientHeight,
      );
      scroller.scrollTop = clamped * maxScroll;
      onScrollProgressRef.current?.(clamped);
    };

    scroller.addEventListener('scroll', publish, { passive: true });
    publish();

    return () => {
      delete window.__setBocaShopScroll;
      scroller.removeEventListener('scroll', publish);
      onScrollProgressRef.current?.(0);
    };
  }, []);

  useEffect(() => {
    return () => {
      onHoverPack(null);
    };
  }, [onHoverPack]);

  const updateHover = (next: ShopItemId | null) => {
    if (hoverRef.current === next) return;
    hoverRef.current = next;
    setLocalHover(next);
    onHoverPack(next);
  };

  const handleCheckout = (itemId: ShopItemId) => {
    onSelectPack(itemId);
    const link = resolveShopItemStripeLink(itemId);
    if (link) {
      openShopItemStripeLink(itemId);
      return;
    }
    setNoticeItem(itemId);
  };

  return (
    <motion.section
      ref={scrollerRef}
      key="shop-view"
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.42, ease: LUXURY_EASE },
      }}
      exit={{
        opacity: 0,
        y: -10,
        pointerEvents: 'none',
        transition: { duration: 0.26, ease: LUXURY_EASE },
      }}
      aria-label="Shop BOCA Water"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="fixed inset-0 z-20 h-[100dvh] pointer-events-auto overflow-y-auto snap-y snap-mandatory md:snap-none overscroll-y-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] px-6 sm:px-[48px]"
    >
      <div className="mx-auto w-full max-w-[1160px] md:pt-[148px] md:pb-[96px]">
        {/* Normal, evenly spaced 2x3 Desktop grid + 6 full-viewport 100dvh centered slides on Mobile */}
        <div className="flex flex-col md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-16">
          {ALL_SHOP_ITEMS.map((item) => {
            const isSelected = item.id === selectedPack;
            const isHovered = item.id === localHover;
            return (
              <div
                key={item.id}
                onPointerEnter={() => updateHover(item.id)}
                onPointerLeave={() => updateHover(null)}
                onClick={() => onSelectPack(item.id)}
                className="pointer-events-auto flex h-[100dvh] shrink-0 snap-start snap-always flex-col items-center justify-center pt-[96px] pb-[28px] md:h-auto md:shrink md:snap-align-none md:justify-start md:pt-0 md:pb-0 border-none bg-transparent text-center"
              >
                {/* Explicit 1:1 DOM-locked 3D stage slot unprojected live per frame in BottleScene */}
                <div
                  data-shop-slot={item.id}
                  aria-hidden="true"
                  className="pointer-events-none h-[290px] w-full shrink-0 md:h-[296px]"
                />

                <h2 className="mt-4 font-editorial text-[32px] font-normal leading-[34px] tracking-[-0.02em] text-[var(--fg)]">
                  {item.title}
                </h2>
                <p className="mt-2 font-ui text-[16px] font-semibold leading-[22px] text-[var(--fg-soft)] tabular-nums">
                  {formatCurrency(item.priceCents)}
                </p>

                <div className="mt-3">
                  <WaterButton
                    label="Order"
                    matchLabel="Continue"
                    shape="puddle"
                    scale={1}
                    active={isSelected || isHovered}
                    onClick={() => handleCheckout(item.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {noticeItem && (
          <p className="pointer-events-auto mt-6 text-center font-ui text-[14px] leading-[20px] text-[var(--fg-muted)]">
            Set the Stripe Payment Link environment variable for {noticeItem} to
            open hosted checkout directly.
          </p>
        )}
      </div>
    </motion.section>
  );
}
