import { formatWordmarkText, type WordmarkCase } from '@/styles/typography';

export interface FooterProps {
  wordmarkCase: WordmarkCase;
  onNavigate: (sectionId: string) => void;
}

export function Footer({ wordmarkCase, onNavigate }: FooterProps) {
  const brandLabel = formatWordmarkText(wordmarkCase, 'Boca');

  return (
    <footer className="relative z-10 border-t border-[#f6f5f1]/[0.09] bg-[#030304]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-6 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-10">
        <div>
          <span className="font-editorial text-[34px] leading-none text-[#f6f5f1]">
            {brandLabel}
          </span>
          <p className="mt-2.5 max-w-sm text-[13.5px] leading-relaxed text-[#f6f5f1]/54">
            Crystal-clear sparkling mineral water in a 12 fl oz (355 mL) clear
            PET vessel. Bottled cold for fine, persistent effervescence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[#f6f5f1]/58">
          <button
            type="button"
            onClick={() => onNavigate('hero')}
            className="pt-[2px] transition-colors duration-300 hover:text-[#f6f5f1]"
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => onNavigate('about')}
            className="pt-[2px] transition-colors duration-300 hover:text-[#f6f5f1]"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => onNavigate('press')}
            className="pt-[2px] transition-colors duration-300 hover:text-[#f6f5f1]"
          >
            Press
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="pt-[2px] transition-colors duration-300 hover:text-[#f6f5f1]"
          >
            Shop
          </button>
          <span className="text-[#f6f5f1]/36 tabular-nums">
            © {new Date().getFullYear()} Boca Water Co.
          </span>
        </div>
      </div>
    </footer>
  );
}
