export type SiteView = 'home' | 'shop' | 'about';

export interface NavbarProps {
  activeView: SiteView;
  onSelectView: (view: SiteView) => void;
}

export function Navbar({ activeView, onSelectView }: NavbarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 pointer-events-none">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 sm:px-10">
        <button
          type="button"
          onClick={() => onSelectView('home')}
          className="pointer-events-auto whitespace-nowrap border-0 bg-transparent px-0 pt-[4px] pb-[2px] font-editorial text-[24px] font-normal leading-none tracking-[-0.01em] text-[#f6f5f1] transition-opacity duration-200 hover:opacity-78"
        >
          BOCA water
        </button>

        <nav
          aria-label="Primary"
          className="pointer-events-auto flex items-center gap-7 sm:gap-9"
        >
          <button
            type="button"
            onClick={() => onSelectView('shop')}
            aria-current={activeView === 'shop' ? 'page' : undefined}
            className={`whitespace-nowrap border-0 bg-transparent px-0 pt-[4px] pb-[2px] font-ui text-[14px] font-normal leading-none tracking-[-0.005em] transition-colors duration-200 ${
              activeView === 'shop'
                ? 'text-[#f6f5f1]'
                : 'text-[#f6f5f1]/64 hover:text-[#f6f5f1]'
            }`}
          >
            Shop
          </button>
          <button
            type="button"
            onClick={() => onSelectView('about')}
            aria-current={activeView === 'about' ? 'page' : undefined}
            className={`whitespace-nowrap border-0 bg-transparent px-0 pt-[4px] pb-[2px] font-ui text-[14px] font-normal leading-none tracking-[-0.005em] transition-colors duration-200 ${
              activeView === 'about'
                ? 'text-[#f6f5f1]'
                : 'text-[#f6f5f1]/64 hover:text-[#f6f5f1]'
            }`}
          >
            About
          </button>
        </nav>
      </div>
    </header>
  );
}
