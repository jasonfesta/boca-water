import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Type, X } from 'lucide-react';
import {
  FONT_CANDIDATES,
  WORDMARK_CASES,
  type SerifFontId,
  type WordmarkCase,
} from '@/styles/typography';
import { cn } from '@/utils/cn';

export interface WordmarkTesterProps {
  serifId: SerifFontId;
  wordmarkCase: WordmarkCase;
  onSelectSerif: (id: SerifFontId) => void;
  onSelectCase: (textCase: WordmarkCase) => void;
}

export function WordmarkTester({
  serifId,
  wordmarkCase,
  onSelectSerif,
  onSelectCase,
}: WordmarkTesterProps) {
  const [open, setOpen] = useState(false);
  const activeFont =
    FONT_CANDIDATES.find((c) => c.id === serifId) ?? FONT_CANDIDATES[0];
  const activeCase =
    WORDMARK_CASES.find((c) => c.id === wordmarkCase) ?? WORDMARK_CASES[0];

  return (
    <div className="fixed bottom-5 left-5 z-30">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="collapsed"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', duration: 0.2, bounce: 0 }}
            onClick={() => setOpen(true)}
            aria-label="Open wordmark typeface selector"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#f6f5f1]/[0.14] bg-[#060607]/82 px-3.5 pt-[9px] pb-[7px] text-[12.5px] font-medium leading-none text-[#f6f5f1]/85 backdrop-blur-md transition-colors hover:border-[#f6f5f1]/[0.28] hover:text-[#f6f5f1] active:scale-[0.98]"
          >
            <Type className="h-3.5 w-3.5 text-[#dce8eb] -translate-y-[1px]" />
            <span className="font-editorial text-[15px] leading-none">
              {activeCase.sample}
            </span>
            <span className="text-[#f6f5f1]/45 font-normal">
              {activeFont.name}
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', duration: 0.22, bounce: 0 }}
            className="surface-glass w-[310px] sm:w-[340px] rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#f6f5f1]">
                Wordmark Typeface
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close wordmark typeface selector"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full pt-[2px] text-[#f6f5f1]/60 transition-colors hover:bg-[#f6f5f1]/[0.08] hover:text-[#f6f5f1]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {WORDMARK_CASES.map((option) => {
                const selected = option.id === wordmarkCase;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelectCase(option.id)}
                    className={cn(
                      'rounded-xl border px-2.5 pt-[9px] pb-[7px] text-center leading-none transition-colors active:scale-[0.98]',
                      selected
                        ? 'border-[#f6f5f1]/40 bg-[#f6f5f1] text-[#030304] font-medium'
                        : 'border-[#f6f5f1]/[0.1] bg-[#f6f5f1]/[0.03] text-[#f6f5f1]/75 hover:border-[#f6f5f1]/[0.22] hover:text-[#f6f5f1]',
                    )}
                  >
                    <span
                      className="block text-[16px] leading-none"
                      style={{ fontFamily: activeFont.cssFamily }}
                    >
                      {option.sample}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {FONT_CANDIDATES.map((candidate) => {
                const selected = candidate.id === serifId;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => onSelectSerif(candidate.id)}
                    className={cn(
                      'flex flex-col items-start rounded-xl border px-3 pt-[9px] pb-[7px] text-left transition-colors active:scale-[0.98]',
                      selected
                        ? 'border-[#dce8eb]/50 bg-[#dce8eb]/[0.12] text-[#f6f5f1]'
                        : 'border-[#f6f5f1]/[0.08] bg-[#f6f5f1]/[0.02] text-[#f6f5f1]/72 hover:border-[#f6f5f1]/[0.18] hover:text-[#f6f5f1]',
                    )}
                  >
                    <span
                      className="text-[17px] leading-tight text-[#f6f5f1]"
                      style={{ fontFamily: candidate.cssFamily }}
                    >
                      {activeCase.sample}
                    </span>
                    <span className="mt-0.5 text-[11.5px] leading-tight text-[#f6f5f1]/52 truncate w-full">
                      {candidate.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
