import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useIsPresent } from 'motion/react';
import type { ScienceHotspotId } from '@/scene/types';

const SOFT_ENTER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SOFT_EXIT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const SCIENCE_TITLE_WORDS = ['Made', 'in', 'Boca', 'Raton.'] as const;

const SCIENCE_ESSAY_WORDS =
  'BOCA means mouth—where volcanic spring meets open air. Filtered slowly through deep basalt stone for silky natural silica, then infused below the threshold of taste with 150 mg of Suntheanine® L-Theanine for calm, unhurried clarity without caffeine or bitterness.'.split(
    ' ',
  );

const DESIGN_ESSAY_WORDS =
  'Every unnecessary layer was stripped away. A 12 fl oz crystal-clear vessel sealed beneath an architectural matte-white lid—no paper sleeve, no adhesive, no tint. Only pure refraction, rising carbonation, and light passing straight through.'.split(
    ' ',
  );

export type HotspotPositionsMap = Record<
  ScienceHotspotId,
  { x: number; y: number; visible: boolean }
>;

export interface AboutViewProps {
  mode: 'science' | 'design';
  targetStop?: 0 | 1;
  enterDelay?: number;
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

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

/**
 * Unified 2-Section 60fps Kinetic Scroll View shared identically by Science & Design.
 * - Identical smooth Science kinetic scroll animation on both Science and Design (zero arrows).
 * - Zero remount flicker when scrolling up and down between Section 0 and Section 1:
 *   both states glide smoothly via GPU `translate3d` + `smoothstep^1.45` opacity.
 * - Section 1's editorial essay reveals word-by-word once on entry and resets only on page re-entry.
 */
export function AboutView({
  mode,
  enterDelay = 0.14,
  onScrollProgress,
}: AboutViewProps) {
  const isDesign = mode === 'design';
  const isPresent = useIsPresent();
  const isPresentRef = useRef(isPresent);
  isPresentRef.current = isPresent;
  const stageRef = useRef<HTMLDivElement>(null);
  const section0Ref = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const onScrollProgressRef = useRef(onScrollProgress);
  onScrollProgressRef.current = onScrollProgress;

  const [essayRevealed, setEssayRevealed] = useState(false);
  const essayRevealedRef = useRef(false);

  const targetPRef = useRef(0);
  const currentPRef = useRef(0);
  const settleStopRef = useRef<0 | 1 | null>(0);
  const lastInputTimeRef = useRef(0);
  const lastScrollDirRef = useRef<1 | -1>(1);
  const glideRef = useRef<{
    from: number;
    to: number;
    startTime: number;
    durationMs: number;
  } | null>(null);

  const glideToStop = useCallback((stop: 0 | 1, durationMs = 1150) => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    settleStopRef.current = stop;
    lastInputTimeRef.current = 0;
    if (stop === 1 && !essayRevealedRef.current) {
      essayRevealedRef.current = true;
      setEssayRevealed(true);
    }
    if (reduced) {
      glideRef.current = null;
      targetPRef.current = stop;
      currentPRef.current = stop;
      return;
    }
    glideRef.current = {
      from: currentPRef.current,
      to: stop,
      startTime: performance.now(),
      durationMs,
    };
  }, []);

  useEffect(() => {
    targetPRef.current = 0;
    currentPRef.current = 0;
    settleStopRef.current = 0;
    glideRef.current = null;
    essayRevealedRef.current = false;
    setEssayRevealed(false);
    onScrollProgressRef.current?.(isDesign ? 1 : 0);

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let cachedVh = Math.max(1, window.innerHeight);
    let touchStartY = 0;
    let touchStartX = 0;
    let touchMode: 'undecided' | 'scroll' | 'ignore' = 'undecided';
    let rafId = 0;
    let prevNow = performance.now();

    const ro = new ResizeObserver(() => {
      cachedVh = Math.max(1, stageRef.current?.clientHeight ?? window.innerHeight);
    });
    if (stageRef.current) ro.observe(stageRef.current);

    const storySetter = (progress: number) => {
      if (!isPresentRef.current) return;
      const clamped = clamp01(progress);
      glideRef.current = null;
      targetPRef.current = clamped;
      currentPRef.current = clamped;
      const stop: 0 | 1 = clamped >= 0.5 ? 1 : 0;
      settleStopRef.current = stop;
      lastInputTimeRef.current = 0;
      onScrollProgressRef.current?.(isDesign ? 1 - clamped : 0);
      if (stop === 1 && !essayRevealedRef.current) {
        essayRevealedRef.current = true;
        setEssayRevealed(true);
      }
    };
    window.__setBocaStoryScroll = storySetter;

    const onWheel = (e: WheelEvent) => {
      if (!isPresentRef.current) return;
      e.preventDefault();
      glideRef.current = null;
      const step = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      if (Math.abs(step) < 0.1) return;
      lastScrollDirRef.current = step >= 0 ? 1 : -1;
      targetPRef.current = clamp01(targetPRef.current + step * 0.00125);
      lastInputTimeRef.current = performance.now();
      settleStopRef.current = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!isPresentRef.current || e.touches.length === 0) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchMode = 'undecided';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPresentRef.current || touchMode === 'ignore' || e.touches.length === 0) return;
      const y = e.touches[0].clientY;
      const x = e.touches[0].clientX;
      const dy = touchStartY - y;
      const dx = touchStartX - x;
      if (touchMode === 'undecided') {
        if (Math.hypot(dx, dy) < 6) return;
        touchMode = Math.abs(dy) >= Math.abs(dx) ? 'scroll' : 'ignore';
      }
      if (touchMode !== 'scroll') return;
      touchStartY = y;
      glideRef.current = null;
      lastScrollDirRef.current = dy >= 0 ? 1 : -1;
      targetPRef.current = clamp01(targetPRef.current + dy * 0.0022);
      lastInputTimeRef.current = performance.now();
      settleStopRef.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPresentRef.current) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        glideToStop(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') {
        e.preventDefault();
        glideToStop(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        glideToStop(1);
      }
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (document.hidden) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000));
      prevNow = now;

      const activeGlide = glideRef.current;
      if (activeGlide) {
        const u = clamp01((now - activeGlide.startTime) / activeGlide.durationMs);
        const eased = easeInOutQuint(u);
        const val = activeGlide.from + (activeGlide.to - activeGlide.from) * eased;
        targetPRef.current = val;
        currentPRef.current = val;
        settleStopRef.current = activeGlide.to >= 0.5 ? 1 : 0;
        if (u >= 1) {
          targetPRef.current = activeGlide.to;
          currentPRef.current = activeGlide.to;
          glideRef.current = null;
        }
      } else {
        if (lastInputTimeRef.current > 0 && now - lastInputTimeRef.current > 145) {
          if (settleStopRef.current === null) {
            const threshold = lastScrollDirRef.current > 0 ? 0.28 : 0.72;
            settleStopRef.current = targetPRef.current >= threshold ? 1 : 0;
          }
          const settle = settleStopRef.current;
          if (Math.abs(targetPRef.current - settle) > 1e-4) {
            targetPRef.current +=
              (settle - targetPRef.current) * (1 - Math.exp(-4.6 * dt));
          } else {
            targetPRef.current = settle;
          }
        }

        currentPRef.current +=
          (targetPRef.current - currentPRef.current) * (1 - Math.exp(-4.8 * dt));
      }

      const p = clamp01(currentPRef.current);

      // Identical scroll progression synced to 3D stage (stop publishing the instant this view begins exiting!)
      if (isPresentRef.current) {
        onScrollProgressRef.current?.(isDesign ? 1 - p : 0);
      }

      // Trigger Section 1's word-by-word write-out once smoothly as it glides into view (zero reset flicker!)
      if (!essayRevealedRef.current && p >= 0.28) {
        essayRevealedRef.current = true;
        setEssayRevealed(true);
      }

      const vh = cachedVh;
      const s0 = section0Ref.current;
      const s1 = section1Ref.current;

      if (s0) {
        const delta0 = -p;
        const alpha0 = Math.pow(smoothstep(0.68, 0.05, Math.abs(delta0)), 1.45);
        const y0 = reducedMotion ? 0 : Math.round(delta0 * vh * 0.62);
        s0.style.opacity = alpha0.toFixed(3);
        s0.style.visibility = alpha0 > 0.01 ? 'visible' : 'hidden';
        s0.style.transform = `translate3d(0px, ${y0}px, 0)`;
      }

      if (s1) {
        const delta1 = 1 - p;
        const alpha1 = Math.pow(smoothstep(0.68, 0.05, Math.abs(delta1)), 1.45);
        const y1 = reducedMotion ? 0 : Math.round(delta1 * vh * 0.62);
        s1.style.opacity = alpha1.toFixed(3);
        s1.style.visibility = alpha1 > 0.01 ? 'visible' : 'hidden';
        s1.style.transform = `translate3d(0px, ${y1}px, 0)`;
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      if (window.__setBocaStoryScroll === storySetter) {
        delete window.__setBocaStoryScroll;
      }
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isDesign, glideToStop]);

  const essayWords = isDesign ? DESIGN_ESSAY_WORDS : SCIENCE_ESSAY_WORDS;

  return (
    <motion.section
      ref={stageRef}
      key={`kinetic-${mode}`}
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
      aria-label={isDesign ? 'BOCA WATER Design' : 'BOCA WATER Science'}
      className="fixed inset-0 z-20 pointer-events-none overflow-hidden"
    >
      {/* SECTION 0 (p = 0.0):
          - Science: "Made in Boca Raton." writes out once on arrival, then glides cleanly on scroll
          - Design: Full-viewport 360-deg rotatable crystal 3D bottle using the identical smooth scroll animation */}
      <div
        ref={section0Ref}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-[var(--header-clearance)] pb-16 sm:px-[48px] pointer-events-none will-change-transform"
      >
        {!isDesign && (
          <h1 className="m-0 flex flex-wrap items-baseline justify-center gap-x-[0.26em] text-center font-editorial text-[clamp(46px,11.6vw,62px)] sm:text-[clamp(76px,8.8vw,138px)] font-normal leading-[0.98] tracking-[-0.03em] text-[var(--fg)]">
            {SCIENCE_TITLE_WORDS.map((word, idx) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.72,
                  delay: 0.14 + idx * 0.22,
                  ease: SOFT_ENTER_EASE,
                }}
                className="inline-block"
              >
                {word}
              </motion.span>
            ))}
          </h1>
        )}
      </div>

      {/* SECTION 1 (p = 1.0):
          Identical smooth kinetic gallery layout for BOTH Science & Design (zero arrows). */}
      <div
        ref={section1Ref}
        style={{ opacity: 0, visibility: 'hidden' }}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-[var(--header-clearance)] pb-16 sm:px-[48px] lg:px-[72px] pointer-events-none will-change-transform"
      >
        <p className="m-0 max-w-[min(92vw,1060px)] text-center font-editorial text-[clamp(24px,5.5vw,30px)] sm:text-[clamp(34px,3.35vw,50px)] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--fg)] [text-wrap:balance]">
          {essayWords.map((word, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 14 }}
              animate={
                essayRevealed
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 14 }
              }
              transition={{
                duration: 0.62,
                delay: essayRevealed ? 0.05 + idx * 0.038 : 0,
                ease: SOFT_ENTER_EASE,
              }}
              className="inline-block mr-[0.26em]"
            >
              {word}
            </motion.span>
          ))}
        </p>
      </div>
    </motion.section>
  );
}
