import type { BottleScrollSection } from '@/scene/types';
import { cn } from '@/utils/cn';

export interface ChapterItem {
  id: string;
  matchSections: readonly BottleScrollSection[];
  label: string;
}

export const CHAPTERS: readonly ChapterItem[] = [
  { id: 'hero', matchSections: ['hero'], label: 'Boca' },
  { id: 'about', matchSections: ['silhouette', 'bubbles'], label: 'About' },
  { id: 'press', matchSections: ['cap'], label: 'Press' },
  { id: 'shop', matchSections: ['pack'], label: 'Shop' },
] as const;

export interface ScrollChapterNavProps {
  activeSection: BottleScrollSection;
  onSelectChapter: (id: string) => void;
}

export function ScrollChapterNav({
  activeSection,
  onSelectChapter,
}: ScrollChapterNavProps) {
  return (
    <aside
      aria-label="Page sections"
      className="fixed bottom-5 right-5 z-30 hidden md:flex items-center gap-1 rounded-full border border-[#f6f5f1]/[0.1] bg-[#060607]/75 px-2.5 py-1.5 backdrop-blur-md"
    >
      {CHAPTERS.map((chapter) => {
        const isActive = chapter.matchSections.includes(activeSection);
        return (
          <button
            key={chapter.id}
            type="button"
            onClick={() => onSelectChapter(chapter.id)}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 pt-[7px] pb-[5px] text-[12px] leading-none transition-all duration-300 active:scale-[0.97]',
              isActive
                ? 'bg-[#f6f5f1]/[0.12] text-[#f6f5f1] font-medium'
                : 'text-[#f6f5f1]/46 hover:text-[#f6f5f1]/82',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-transform duration-300 -translate-y-[1px]',
                isActive ? 'bg-[#f6f5f1] scale-110' : 'bg-[#f6f5f1]/35',
              )}
            />
            <span>{chapter.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
