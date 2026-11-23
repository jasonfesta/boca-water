import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import {
  SHOP_CATALOG_LIST,
  formatCurrency,
  openShopItemStripeLink,
  resolveShopItemStripeLink,
  type ShopItemId,
} from '@/commerce';
import { WaterButton } from '@/components/ui/WaterButton';

const SOFT_ENTER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SOFT_EXIT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface ShopViewProps {
  selectedPack: ShopItemId;
  packExpanded: boolean;
  goldWordmark?: boolean;
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
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const onScrollProgressRef = useRef(onScrollProgress);
  onScrollProgressRef.current = onScrollProgress;

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

  const scrollToSlide = (idx: number) => {
    slideRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.section
      ref={scrollerRef}
      key="shop-view"
      initial={{ opacity: 0, y: 18 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.95, ease: SOFT_ENTER_EASE },
      }}
      exit={{
        opacity: 0,
        y: -12,
        pointerEvents: 'none',
        transition: { duration: 0.62, ease: SOFT_EXIT_EASE },
      }}
      aria-label="Shop BOCA Water"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="fixed inset-0 z-20 h-[100dvh] pointer-events-auto overflow-y-auto md:overflow-hidden snap-y snap-mandatory md:snap-none overscroll-y-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] px-6 sm:px-[48px] lg:px-[72px]"
    >
      {/* Desktop: Single gallery-framed screen with generous outer padding, lowered ~128px & 100% above the fold.
          Mobile: 3 full-viewport centered snapped slides (Single, Six-Pack, Case). */}
      <div className="mx-auto w-full max-w-[1040px] md:flex md:h-[100dvh] md:flex-col md:items-center md:justify-center md:pt-[164px] md:pb-[52px]">
        <div className="flex w-full flex-col md:grid md:grid-cols-3 md:items-end md:gap-x-10 lg:gap-x-14">
          {ALL_SHOP_ITEMS.map((item, idx) => {
            const isSelected = item.id === selectedPack;
            const isHovered = item.id === localHover;
            return (
              <div
                key={item.id}
                ref={(el) => {
                  slideRefs.current[idx] = el;
                }}
                onPointerEnter={() => updateHover(item.id)}
                onPointerLeave={() => updateHover(null)}
                onClick={() => onSelectPack(item.id)}
                className="relative pointer-events-auto flex h-[100dvh] shrink-0 snap-start snap-always flex-col items-center justify-center pt-[108px] pb-[64px] md:h-auto md:shrink md:snap-align-none md:justify-end md:pt-0 md:pb-0 border-none bg-transparent text-center"
              >
                {/* Explicit 1:1 DOM-locked 3D stage slot unprojected live per frame in BottleScene */}
                <div
                  data-shop-slot={item.id}
                  aria-hidden="true"
                  className="pointer-events-none h-[264px] w-full shrink-0 md:h-[268px]"
                />

                <h2 className="mt-5 font-editorial text-[30px] sm:text-[32px] font-normal leading-[34px] tracking-[-0.02em] text-[var(--fg)]">
                  {item.title}
                </h2>
                <p className="mt-1.5 font-ui text-[15px] font-semibold leading-[22px] text-[var(--fg-soft)] tabular-nums">
                  {formatCurrency(item.priceCents)}
                </p>

                <div className="mt-2.5">
                  <WaterButton
                    label="Buy Now"
                    size="shop"
                    active={isSelected || isHovered}
                    onClick={() => handleCheckout(item.id)}
                  />
                </div>

                {/* Quiet mobile scroll indicator on Slides 1 & 2 */}
                {idx < ALL_SHOP_ITEMS.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToSlide(idx + 1);
                    }}
                    aria-label={`View ${ALL_SHOP_ITEMS[idx + 1].title}`}
                    className="md:hidden absolute bottom-7 left-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center border-none bg-transparent pt-[2px] text-[var(--fg-muted)] transition-opacity duration-300 hover:opacity-100 opacity-65"
                  >
                    <ChevronDown className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
                  </button>
                )}
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
