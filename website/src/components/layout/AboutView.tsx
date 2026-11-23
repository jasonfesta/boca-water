import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
 * Unified 2-Section 60fps Kinetic Scroll View shared identically by Science & Design:
 * - Science:
 *   - State 0 (p = 0): "Made in Boca Raton." writing out word-by-word on lock
 *   - State 1 (p = 1): Large editorial Science statement writing out word-by-word on lock
 * - Design:
 *   - State 0 (p = 0): Full unrestricted 360-degree interactive 3D bottle inspection
 *   - State 1 (p = 1): Bottle softly glides away; large editorial Design statement writes out word-by-word on lock
 *
 * Both states support continuous 60fps rAF kinetic scroll up/down (wheel, touch, keys, chevron click)
 * and release their entrance animation cleanly whenever hitting their locking state.
 */
export function AboutView({
  mode,
  onScrollProgress,
}: AboutViewProps) {
  const isDesign = mode === 'design';
  const stageRef = useRef<HTMLDivElement>(null);
  const section0Ref = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const onScrollProgressRef = useRef(onScrollProgress);
  onScrollProgressRef.current = onScrollProgress;

  // Release keys incremented each time the user locks into State 0 or State 1
  const [state0Key, setState0Key] = useState(1);
  const [state1Key, setState1Key] = useState(0);

  const targetPRef = useRef(0);
  const currentPRef = useRef(0);
  const settleStopRef = useRef<0 | 1 | null>(0);
  const lastInputTimeRef = useRef(0);
  const lastScrollDirRef = useRef<1 | -1>(1);
  const lastLockedRef = useRef<0 | 1 | null>(0);
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
    // Reset cleanly to State 0 on mount/mode change
    targetPRef.current = 0;
    currentPRef.current = 0;
    settleStopRef.current = 0;
    lastLockedRef.current = 0;
    glideRef.current = null;
    setState0Key((k) => k + 1);
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

    window.__setBocaStoryScroll = (progress: number) => {
      const clamped = clamp01(progress);
      glideRef.current = null;
      targetPRef.current = clamped;
      currentPRef.current = clamped;
      const stop: 0 | 1 = clamped >= 0.5 ? 1 : 0;
      settleStopRef.current = stop;
      lastInputTimeRef.current = 0;
      onScrollProgressRef.current?.(isDesign ? 1 - clamped : 0);
      if (stop === 1 && lastLockedRef.current !== 1) {
        lastLockedRef.current = 1;
        setState1Key((k) => k + 1);
      } else if (stop === 0 && lastLockedRef.current !== 0) {
        lastLockedRef.current = 0;
        setState0Key((k) => k + 1);
      }
    };

    const onWheel = (e: WheelEvent) => {
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
      if (e.touches.length === 0) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      // In Design State 0, single-finger drag on the canvas orbits the 3D bottle 360 degrees;
      // in Design State 1 or anywhere in Science, vertical touch swipe drives kinetic scroll.
      if (isDesign && currentPRef.current < 0.35 && e.touches.length === 1) {
        touchMode = 'ignore';
      } else {
        touchMode = 'undecided';
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchMode === 'ignore' || e.touches.length === 0) return;
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
            // Directional bias so even an effortless short scroll locks into the intended state
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

      // Sync 3D BottleScene smoothly:
      // - Science: always 0 (bottle softly tucked below)
      // - Design: 1 at State 0 (360-deg bottle), smoothly descending to 0 as user scrolls to State 1
      onScrollProgressRef.current?.(isDesign ? 1 - p : 0);

      // Release lock-state word-by-word animations cleanly on entering either stop (up OR down)
      if (p > 0.26 && p < 0.74 && lastLockedRef.current !== null) {
        lastLockedRef.current = null;
      } else if (p <= 0.14 && settleStopRef.current === 0 && lastLockedRef.current !== 0) {
        lastLockedRef.current = 0;
        setState0Key((k) => k + 1);
      } else if (p >= 0.86 && settleStopRef.current === 1 && lastLockedRef.current !== 1) {
        lastLockedRef.current = 1;
        setState1Key((k) => k + 1);
      }

      const vh = cachedVh;
      const s0 = section0Ref.current;
      const s1 = section1Ref.current;

      if (s0) {
        const delta0 = -p; // 0 -> -1
        const alpha0 = Math.pow(smoothstep(0.68, 0.05, Math.abs(delta0)), 1.45);
        const y0 = reducedMotion ? 0 : Math.round(delta0 * vh * 0.62);
        s0.style.opacity = alpha0.toFixed(3);
        s0.style.visibility = alpha0 > 0.01 ? 'visible' : 'hidden';
        s0.style.transform = `translate3d(0px, ${y0}px, 0)`;
      }

      if (s1) {
        const delta1 = 1 - p; // +1 -> 0
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
      delete window.__setBocaStoryScroll;
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
      initial={{ opacity: 0, y: 16 }}
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
      aria-label={isDesign ? 'BOCA WATER Design' : 'BOCA WATER Science'}
      className="fixed inset-0 z-20 pointer-events-none overflow-hidden"
    >
      {/* SECTION 0 (p = 0.0):
          - Science: "Made in Boca Raton." releasing word-by-word on lock
          - Design: Unobstructed full-viewport 360-deg rotatable 3D bottle + subtle scroll cue */}
      <div
        ref={section0Ref}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-[var(--header-clearance)] pb-16 sm:px-[48px] pointer-events-none will-change-transform"
      >
        {!isDesign && (
          <h1
            key={`s0-title-${state0Key}`}
            className="m-0 flex flex-wrap items-baseline justify-center gap-x-[0.26em] text-center font-editorial text-[clamp(46px,11.6vw,62px)] sm:text-[clamp(76px,8.8vw,138px)] font-normal leading-[0.98] tracking-[-0.03em] text-[var(--fg)]"
          >
            {SCIENCE_TITLE_WORDS.map((word, idx) => (
              <motion.span
                key={`${state0Key}-${word}`}
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

        <button
          type="button"
          onClick={() => glideToStop(1)}
          aria-label={
            isDesign
              ? 'Scroll down to read about Boca Water design'
              : 'Scroll down to read about Boca Water science'
          }
          className="pointer-events-auto absolute bottom-8 sm:bottom-11 left-1/2 -translate-x-1/2 flex h-11 w-11 items-center justify-center rounded-full border-none bg-transparent pt-[2px] text-[var(--fg-muted)] transition-colors duration-300 hover:text-[var(--fg)] active:scale-95"
        >
          <ChevronDown className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {/* SECTION 1 (p = 1.0):
          Identical gallery layout for BOTH Science & Design — really large editorial serif
          statement writing out smoothly word-by-word as Section 1 hits its locking state. */}
      <div
        ref={section1Ref}
        style={{ opacity: 0, visibility: 'hidden' }}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-[var(--header-clearance)] pb-16 sm:px-[48px] lg:px-[72px] pointer-events-none will-change-transform"
      >
        <button
          type="button"
          onClick={() => glideToStop(0)}
          aria-label={
            isDesign
              ? 'Scroll up to inspect the 3D bottle'
              : 'Scroll up to Made in Boca Raton'
          }
          className="pointer-events-auto mb-6 sm:mb-8 flex h-10 w-10 items-center justify-center rounded-full border-none bg-transparent pt-[2px] text-[var(--fg-muted)] transition-colors duration-300 hover:text-[var(--fg)] active:scale-95"
        >
          <ChevronUp className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>

        <p
          key={`s1-essay-${state1Key}`}
          className="m-0 max-w-[min(92vw,1060px)] text-center font-editorial text-[clamp(24px,5.5vw,30px)] sm:text-[clamp(34px,3.35vw,50px)] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--fg)] [text-wrap:balance]"
        >
          {state1Key > 0 &&
            essayWords.map((word, idx) => (
              <motion.span
                key={`${state1Key}-${idx}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.62,
                  delay: 0.06 + idx * 0.045,
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
