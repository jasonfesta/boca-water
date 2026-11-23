import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import type { ScienceHotspotId } from '@/scene/types';

const LUXURY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const FLOW_STOPS = [0, 1] as const;

const SCIENCE_PARAGRAPHS = [
  'BOCA means mouth—where volcanic spring meets open air. Filtered slowly through deep basalt stone, naturally rich in silky silica.',
  'We added 150 mg of Suntheanine® L-Theanine below the threshold of taste, for calm, unhurried mental clarity without caffeine or bitterness. No paper sleeve, no flavoring, nothing opaque to hide behind—just crystal-clear sparkling water, sealed cold so you can live in the clear.',
] as const;

export type HotspotPositionsMap = Record<
  ScienceHotspotId,
  { x: number; y: number; visible: boolean }
>;

export interface AboutViewProps {
  targetStop?: 0 | 1;
  onStopChange?: (stop: 0 | 1) => void;
  onScrollProgress?: (progress: number) => void;
  activeHotspot?: ScienceHotspotId | null;
  onSelectHotspot?: (id: ScienceHotspotId | null) => void;
  hotspotPositionsRef?: React.RefObject<HotspotPositionsMap>;
  goldWordmark?: boolean;
}

declare global {
  interface Window {
    __setBocaStoryScroll?: (progress: number) => void;
  }
}

export function AboutView({
  targetStop = 0,
  onStopChange,
  onScrollProgress,
  activeHotspot: _activeHotspot = null,
  onSelectHotspot,
  hotspotPositionsRef: _hotspotPositionsRef,
  goldWordmark = true,
}: AboutViewProps) {
  void _activeHotspot;
  void _hotspotPositionsRef;
  void goldWordmark;
  const narrativeRef = useRef<HTMLDivElement>(null);

  const onStopChangeRef = useRef(onStopChange);
  const onScrollProgressRef = useRef(onScrollProgress);
  const onSelectHotspotRef = useRef(onSelectHotspot);
  const externalJumpRef = useRef<((stop: 0 | 1) => void) | null>(null);
  const initialStopRef = useRef<0 | 1>(targetStop);

  onStopChangeRef.current = onStopChange;
  onScrollProgressRef.current = onScrollProgress;
  onSelectHotspotRef.current = onSelectHotspot;

  const { wordParagraphs, signatureDelay } = useMemo(() => {
    let globalIdx = 0;
    const paragraphs = SCIENCE_PARAGRAPHS.map((paragraph) =>
      paragraph.split(' ').map((word) => ({
        word,
        idx: globalIdx++,
      })),
    );
    // Sequence handwritten signature cleanly AFTER the final paragraph finishes revealing
    return {
      wordParagraphs: paragraphs,
      signatureDelay: 0.14 + globalIdx * 0.032 + 0.52,
    };
  }, []);

  // When user clicks Science (0) or Design (1) in Navbar while already in this flow, glide smoothly!
  useEffect(() => {
    externalJumpRef.current?.(targetStop);
  }, [targetStop]);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let scrollTarget: number = initialStopRef.current;
    let scrollCurrent: number = initialStopRef.current;
    let settleTarget: number | null = initialStopRef.current;
    let programmaticTarget: 0 | 1 | null = null;
    let lastReportedStop: 0 | 1 = initialStopRef.current;
    let lastWheelTime = 0;
    let lastPublished = -1;
    let touchStartY = 0;

    let targetMouseX = 0;
    let targetMouseY = 0;
    let curMouseX = 0;
    let curMouseY = 0;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const smoothstep = (e0: number, e1: number, x: number) => {
      const t = clamp01((x - e0) / (e1 - e0));
      return t * t * (3 - 2 * t);
    };

    const reportStop = (stop: 0 | 1) => {
      if (stop === lastReportedStop) return;
      lastReportedStop = stop;
      onStopChangeRef.current?.(stop);
    };

    const jumpToStop = (stop: 0 | 1) => {
      programmaticTarget = stop;
      scrollTarget = stop;
      settleTarget = stop;
      lastWheelTime = 0;
      reportStop(stop);
    };

    externalJumpRef.current = jumpToStop;

    window.__setBocaStoryScroll = (progress: number) => {
      const clamped = clamp01(progress);
      programmaticTarget = null;
      scrollTarget = clamped;
      scrollCurrent = clamped;
      settleTarget = clamped;
      lastWheelTime = 0;
      lastPublished = clamped;
      const stop: 0 | 1 = clamped >= 0.5 ? 1 : 0;
      reportStop(stop);
      onScrollProgressRef.current?.(clamped);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      programmaticTarget = null;
      const step = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      scrollTarget = clamp01(scrollTarget + step * 0.00055);
      lastWheelTime = performance.now();
      settleTarget = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      programmaticTarget = null;
      const y = e.touches[0].clientY;
      const deltaY = touchStartY - y;
      touchStartY = y;
      scrollTarget = clamp01(scrollTarget + deltaY * 0.0013);
      lastWheelTime = performance.now();
      settleTarget = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'End') {
        e.preventDefault();
        jumpToStop(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') {
        e.preventDefault();
        jumpToStop(0);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      targetMouseX = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      targetMouseY = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    };

    const onPointerLeave = () => {
      targetMouseX = 0;
      targetMouseY = 0;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });

    let rafId = 0;
    const t0 = performance.now();
    let prevNow = t0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000));
      const elapsed = (now - t0) / 1000;
      prevNow = now;

      // Silky double-damped 2-swipe coastal-drive settle (0.0 Science <-> 1.0 Design)
      if (now - lastWheelTime > 190) {
        if (settleTarget === null && programmaticTarget === null) {
          const nearest: 0 | 1 = scrollTarget >= 0.45 ? FLOW_STOPS[1] : FLOW_STOPS[0];
          settleTarget = nearest;
          reportStop(nearest);
        }
        if (settleTarget !== null && Math.abs(scrollTarget - settleTarget) > 1e-4) {
          scrollTarget +=
            (settleTarget - scrollTarget) * (1 - Math.exp(-3.6 * dt));
        } else if (settleTarget !== null) {
          scrollTarget = settleTarget;
        }
      }

      const chaseRate = programmaticTarget !== null ? 7.5 : 3.8;
      scrollCurrent +=
        (scrollTarget - scrollCurrent) * (1 - Math.exp(-chaseRate * dt));

      if (Math.abs(scrollCurrent - lastPublished) > 0.0004) {
        lastPublished = scrollCurrent;
        onScrollProgressRef.current?.(scrollCurrent);
      }

      if (programmaticTarget !== null) {
        if (Math.abs(scrollCurrent - programmaticTarget) < 0.025) {
          programmaticTarget = null;
        }
      } else {
        if (scrollCurrent > 0.65 && lastReportedStop !== 1) {
          reportStop(1);
        } else if (scrollCurrent < 0.35 && lastReportedStop !== 0) {
          reportStop(0);
        }
      }

      const mouseAlpha = 1 - Math.exp(-5.5 * dt);
      curMouseX += (targetMouseX - curMouseX) * mouseAlpha;
      curMouseY += (targetMouseY - curMouseY) * mouseAlpha;

      const oscX = reducedMotion
        ? 0
        : Math.sin(elapsed * 0.72) * 3.0 + curMouseX * -10;
      const oscY = reducedMotion
        ? 0
        : Math.cos(elapsed * 0.94) * 4.0 + curMouseY * -7;
      const oscTilt = reducedMotion
        ? 0
        : Math.sin(elapsed * 0.65) * 0.22 + curMouseX * 0.35;

      const vh = Math.max(1, window.innerHeight);

      // Swipe 1 (0.0 — Science): "Made in Boca Raton." + narrative + SVG signature
      if (narrativeRef.current) {
        const narVis = smoothstep(0.56, 0.06, scrollCurrent);
        const shiftY = -scrollCurrent * vh * 0.56;
        narrativeRef.current.style.opacity = narVis.toFixed(3);
        narrativeRef.current.style.visibility =
          narVis > 0.01 ? 'visible' : 'hidden';
        narrativeRef.current.style.transform = `translate3d(${Math.round(oscX)}px, ${Math.round(shiftY + oscY)}px, 0) rotate(${oscTilt.toFixed(2)}deg)`;
      }
    };

    onScrollProgressRef.current?.(scrollCurrent);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      externalJumpRef.current = null;
      delete window.__setBocaStoryScroll;
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      onScrollProgressRef.current?.(0);
      onSelectHotspotRef.current?.(null);
    };
  }, []);

  return (
    <motion.section
      key="science-design-view"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { duration: 0.48, ease: LUXURY_EASE },
      }}
      exit={{
        opacity: 0,
        y: -10,
        pointerEvents: 'none',
        transition: { duration: 0.28, ease: LUXURY_EASE },
      }}
      aria-label="BOCA WATER Science and Design"
      className="fixed inset-0 z-20 pointer-events-none overflow-hidden"
    >
      {/* Swipe 1 (0.0 — Science): "Made in Boca Raton." + word-by-word blur-in narrative + handwritten SVG signature */}
      <div className="absolute inset-0 flex items-center justify-center px-6 pt-[var(--header-clearance)] pb-16 sm:px-[48px]">
        <div
          ref={narrativeRef}
          className="flex max-w-[980px] w-full flex-col items-center text-center will-change-transform"
        >
          <h2 className="m-0 mb-6 font-editorial text-[32px] sm:text-[clamp(44px,4.8vw,66px)] font-normal leading-[1.06] tracking-[-0.02em] text-[var(--fg)]">
            Made in Boca Raton.
          </h2>
          <div className="flex max-w-[330px] sm:max-w-[680px] flex-col items-center gap-5 font-editorial text-[19px] sm:text-[clamp(21px,2.15vw,29px)] font-normal leading-[1.52] tracking-[-0.012em] text-[var(--fg-soft)]">
            {wordParagraphs.map((paraWords, paraIdx) => (
              <p key={paraIdx} className="m-0 [text-wrap:balance]">
                {paraWords.map(({ word, idx }) => (
                  <motion.span
                    key={`${word}-${idx}`}
                    initial={{ opacity: 0, y: 8, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{
                      duration: 0.82,
                      delay: 0.14 + idx * 0.032,
                      ease: LUXURY_EASE,
                    }}
                    className="inline-block mr-[0.24em] will-change-[transform,opacity,filter]"
                  >
                    {word}
                  </motion.span>
                ))}
              </p>
            ))}
          </div>

          {/* Small, refined architectural handwritten pen-stroke signature */}
          <svg
            width="132"
            height="40"
            viewBox="0 0 136 42"
            fill="none"
            aria-label="Boca Water signature"
            className="mt-6 text-[var(--fg-soft)]"
          >
            <motion.path
              d="M12 29 C16 14, 24 8, 28 11 C31 13, 21 24, 17 27 C24 22, 34 18, 37 22 C39 25, 34 29, 39 27 C45 25, 51 16, 56 17 C59 18, 54 27, 59 26 C64 25, 70 19, 75 21 C79 23, 77 28, 84 25 C92 22, 102 18, 122 19"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.78 }}
              transition={{
                pathLength: {
                  duration: 1.35,
                  delay: signatureDelay,
                  ease: LUXURY_EASE,
                },
                opacity: {
                  duration: 0.3,
                  delay: Math.max(0, signatureDelay - 0.05),
                },
              }}
            />
          </svg>
        </div>
      </div>
    </motion.section>
  );
}
