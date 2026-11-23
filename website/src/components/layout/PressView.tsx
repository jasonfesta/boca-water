import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, ChevronLeft, ChevronRight, X } from 'lucide-react';

import { PRESS_ARTICLES, type PressArticle } from '@/data/pressArticles';

const SOFT_ENTER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SOFT_EXIT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface PressViewProps {
  enterDelay?: number;
}

/**
 * Pure monochrome editorial Press grid for BOCA WATER:
 * - Quiet Download Press Kit link followed directly by magazine covers & features
 * - Zero page titles, zero bottom divider, zero email footer — magazine layouts only
 * - Clicking any cover or headline opens a calm full-focus article reader
 */
export function PressView({ enterDelay = 0.14 }: PressViewProps) {
  const [activeArticle, setActiveArticle] = useState<PressArticle | null>(null);

  const stepReaderArticle = useCallback(
    (delta: 1 | -1) => {
      if (!activeArticle) return;
      const curIdx = PRESS_ARTICLES.findIndex((a) => a.id === activeArticle.id);
      if (curIdx < 0) return;
      const nextIdx = (curIdx + delta + PRESS_ARTICLES.length) % PRESS_ARTICLES.length;
      setActiveArticle(PRESS_ARTICLES[nextIdx]);
    },
    [activeArticle],
  );

  useEffect(() => {
    if (!activeArticle) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveArticle(null);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepReaderArticle(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepReaderArticle(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeArticle, stepReaderArticle]);

  return (
    <motion.section
      key="press-view"
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.82, delay: enterDelay, ease: SOFT_ENTER_EASE },
      }}
      exit={{
        opacity: 0,
        y: -10,
        pointerEvents: 'none',
        transition: { duration: 0.48, ease: SOFT_EXIT_EASE },
      }}
      aria-label="Boca Water Press"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="fixed inset-0 z-20 h-[100dvh] pointer-events-auto overflow-y-auto overscroll-y-contain bg-[var(--bg)] [touch-action:pan-y] [-webkit-overflow-scrolling:touch]"
    >
      {/* Clean top fade behind fixed Navbar so scrolled magazine covers disappear seamlessly */}
      <div
        aria-hidden="true"
        className="pointer-events-none sticky top-0 z-10 h-[116px] -mb-[116px] w-full sm:h-[144px] sm:-mb-[144px]"
        style={{
          background:
            'linear-gradient(to bottom, var(--bg) 0%, var(--bg) 82%, transparent 100%)',
        }}
      />

      <div className="mx-auto w-full max-w-[1080px] px-6 pt-[122px] pb-24 sm:px-[48px] sm:pt-[152px] sm:pb-28">
        <div className="flex items-center justify-start pb-8 sm:justify-end sm:pb-10">
          <a
            href="./press-kit/boca-water-press-kit.zip"
            download="boca-water-press-kit.zip"
            className="inline-flex min-h-[44px] items-center gap-2 font-editorial text-[20px] sm:text-[22px] font-normal leading-none tracking-[-0.01em] text-[var(--fg-btn-muted)] no-underline transition-colors duration-200 hover:text-[var(--fg)]"
          >
            <ArrowDownToLine className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>Download Press Kit</span>
          </a>
        </div>

        {/* Clean Editorial Magazine Grid starting with BOCA Magazine Cover */}
        <section aria-label="Press articles">
          <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 sm:gap-y-14 lg:grid-cols-3">
            {PRESS_ARTICLES.map((article) => (
              <article key={article.id} className="group flex flex-col">
                <button
                  type="button"
                  onClick={() => setActiveArticle(article)}
                  aria-label={`Read ${article.publication}: ${article.headline}`}
                  className="block w-full overflow-hidden border-none bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--fg)]"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-[#f7f6f2]">
                    <img
                      src={article.cover}
                      alt={`${article.publication} — ${article.headline}`}
                      decoding="sync"
                      className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.025]"
                    />
                  </div>
                </button>

                <div className="mt-4 sm:mt-5 flex items-baseline justify-between gap-4">
                  <span className="font-editorial italic text-[20px] leading-none text-[var(--fg)]">
                    {article.publication}
                  </span>
                  <span className="font-ui text-[13px] leading-none text-[var(--fg-subtle)] tabular-nums">
                    {article.date}
                  </span>
                </div>

                <h2 className="m-0 mt-2.5 font-editorial text-[26px] sm:text-[28px] font-normal leading-[1.12] tracking-[-0.02em] text-[var(--fg)]">
                  <button
                    type="button"
                    onClick={() => setActiveArticle(article)}
                    className="w-full border-none bg-transparent p-0 pt-[2px] text-left font-inherit text-inherit transition-opacity duration-200 hover:opacity-65"
                  >
                    {article.headline}
                  </button>
                </h2>

                <p className="m-0 mt-2.5 font-ui text-[15px] leading-[1.58] text-[var(--fg-muted)]">
                  {article.excerpt}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Calm Full-Focus Editorial Article Reader (portaled above Navbar & corner controls) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeArticle && (
              <motion.div
                key={activeArticle.id}
                role="dialog"
                aria-modal="true"
                aria-labelledby="press-reader-headline"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.32, ease: SOFT_ENTER_EASE },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.24, ease: SOFT_EXIT_EASE },
                }}
                onClick={() => setActiveArticle(null)}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                className="fixed inset-0 z-[60] h-[100dvh] overflow-y-auto bg-[var(--bg)]/98 backdrop-blur-md text-[var(--fg)]"
              >
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.45, ease: SOFT_ENTER_EASE },
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    transition: { duration: 0.22, ease: SOFT_EXIT_EASE },
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mx-auto w-full max-w-[700px] px-6 pt-10 pb-24 sm:px-10 sm:pt-16"
                >
                  <div className="flex items-center justify-between gap-4 pb-8 sm:pb-10">
                    <span className="font-editorial italic text-[22px] leading-none text-[var(--fg)]">
                      {activeArticle.publication}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveArticle(null)}
                      aria-label="Close article"
                      className="inline-flex h-11 items-center gap-1.5 border-none bg-transparent px-2 pt-[2px] font-ui text-[14px] text-[var(--fg-btn-muted)] transition-colors duration-200 hover:text-[var(--fg)] active:scale-95"
                    >
                      <span>Close</span>
                      <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between gap-4 pb-4">
                    <span className="font-ui text-[13px] text-[var(--fg-subtle)] tabular-nums">
                      {activeArticle.date}
                    </span>
                    <span className="font-ui text-[13px] text-[var(--fg-subtle)] tabular-nums">
                      {activeArticle.readTime}
                    </span>
                  </div>

                  <h2
                    id="press-reader-headline"
                    className="m-0 font-editorial text-[clamp(34px,8vw,56px)] font-normal leading-[1.04] tracking-[-0.025em] text-[var(--fg)] [text-wrap:balance]"
                  >
                    {activeArticle.headline}
                  </h2>

                  <p className="m-0 mt-5 font-editorial text-[21px] sm:text-[25px] leading-[1.35] text-[var(--fg-muted)]">
                    {activeArticle.excerpt}
                  </p>

                  <div className="mx-auto mt-9 sm:mt-10 max-w-[380px] overflow-hidden bg-[#f7f6f2]">
                    <img
                      src={activeArticle.cover}
                      alt={`${activeArticle.publication} — ${activeArticle.headline}`}
                      decoding="sync"
                      className="aspect-[3/4] w-full object-cover"
                    />
                  </div>

                  <div className="mt-9 sm:mt-10 flex flex-col gap-6 font-ui text-[16px] sm:text-[17px] leading-[1.72] text-[var(--fg-soft)]">
                    {activeArticle.body.map((paragraph, idx) => (
                      <p key={idx} className="m-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div className="mt-14 flex items-center justify-between gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => stepReaderArticle(-1)}
                      className="inline-flex h-11 items-center gap-1.5 border-none bg-transparent px-0 pt-[2px] font-editorial text-[20px] text-[var(--fg-btn-muted)] transition-colors duration-200 hover:text-[var(--fg)] active:scale-95"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>Previous story</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => stepReaderArticle(1)}
                      className="inline-flex h-11 items-center gap-1.5 border-none bg-transparent px-0 pt-[2px] font-editorial text-[20px] text-[var(--fg-btn-muted)] transition-colors duration-200 hover:text-[var(--fg)] active:scale-95"
                    >
                      <span>Next story</span>
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </motion.section>
  );
}
