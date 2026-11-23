export type SiteView = 'home' | 'shop' | 'story' | 'science' | 'design' | 'about';

export const SALE_BANNER_CONFIG = {
  enabled: true,
  message: 'First Release — Save up to 50% on Cases. Shop Now',
} as const;

export interface NavbarProps {
  activeView: SiteView;
  goldWordmark?: boolean;
  onSelectView: (view: SiteView) => void;
}

export function Navbar({
  activeView,
  goldWordmark = true,
  onSelectView,
}: NavbarProps) {
  const isHome = activeView === 'home';
  const isShop = activeView === 'shop';
  const isScience =
    activeView === 'story' ||
    activeView === 'science' ||
    activeView === 'about';
  const isDesign = activeView === 'design';

  return (
    <header className="fixed inset-x-0 top-0 z-40 pointer-events-none">
      {SALE_BANNER_CONFIG.enabled && (
        <button
          type="button"
          onClick={() => onSelectView('shop')}
          className="pointer-events-auto flex h-[38px] sm:h-[41px] w-full items-center justify-center whitespace-nowrap border-0 bg-[var(--fg-deep)] px-4 pt-[2px] pb-0 font-editorial text-[15px] sm:text-[19px] font-normal leading-none tracking-[0.015em] text-[var(--bg)] transition-colors duration-500"
        >
          {SALE_BANNER_CONFIG.message}
        </button>
      )}
      <div className="flex w-full items-center justify-between pt-6 px-6 sm:pt-[48px] sm:px-[48px]">
        <button
          type="button"
          onClick={() => onSelectView('home')}
          style={
            goldWordmark
              ? undefined
              : { WebkitTextStroke: '0.45px currentColor' }
          }
          className={`pointer-events-auto whitespace-nowrap border-0 bg-transparent px-0 pt-[2px] pb-0 font-editorial text-[24px] sm:text-[28px] font-normal leading-none tracking-[0.02em] transition-opacity duration-200 hover:opacity-78 ${
            goldWordmark ? 'boca-logo-gold' : 'text-[var(--fg)]'
          }`}
        >
          BOCA WATER
        </button>

        <nav
          aria-label="Primary"
          className="pointer-events-auto flex items-center gap-5 sm:gap-9"
        >
          <button
            type="button"
            onClick={() => onSelectView('shop')}
            aria-current={isShop ? 'page' : undefined}
            className={`whitespace-nowrap border-0 bg-transparent px-0 pt-[2px] pb-0 font-editorial text-[18px] sm:text-[19px] font-normal leading-none tracking-[0.005em] text-[var(--fg)] transition-opacity duration-200 ${
              isHome || isShop
                ? 'opacity-100 hover:opacity-70'
                : 'opacity-35 hover:opacity-70'
            }`}
          >
            Shop
          </button>
          <button
            type="button"
            onClick={() => onSelectView('science')}
            aria-current={isScience ? 'page' : undefined}
            className={`whitespace-nowrap border-0 bg-transparent px-0 pt-[2px] pb-0 font-editorial text-[18px] sm:text-[19px] font-normal leading-none tracking-[0.005em] text-[var(--fg)] transition-opacity duration-200 ${
              isHome || isScience
                ? 'opacity-100 hover:opacity-70'
                : 'opacity-35 hover:opacity-70'
            }`}
          >
            Science
          </button>
          <button
            type="button"
            onClick={() => onSelectView('design')}
            aria-current={isDesign ? 'page' : undefined}
            className={`whitespace-nowrap border-0 bg-transparent px-0 pt-[2px] pb-0 font-editorial text-[18px] sm:text-[19px] font-normal leading-none tracking-[0.005em] text-[var(--fg)] transition-opacity duration-200 ${
              isHome || isDesign
                ? 'opacity-100 hover:opacity-70'
                : 'opacity-35 hover:opacity-70'
            }`}
          >
            Design
          </button>
        </nav>
      </div>
    </header>
  );
}
