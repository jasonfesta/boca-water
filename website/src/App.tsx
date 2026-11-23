import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BottleScene } from '@/scene/BottleScene';
import type { PackMode, ScienceHotspotId } from '@/scene/types';
import {
  DEFAULT_SERIF_ID,
  FONT_CANDIDATES,
  applySerifFontToDocument,
  loadSerifFont,
  renderWordmarkCanvas,
  renderWordmarkSideCanvas,
  type WordmarkCase,
} from '@/styles/typography';
import type { ShopItemId } from '@/commerce';
import {
  AboutView,
  KineticParallaxStage,
  Navbar,
  PressView,
  ShopView,
  type SiteView,
} from '@/components/layout';

const SCROLL_STOPS = [0, 1 / 3, 2 / 3, 1] as const;
const LUXURY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function isPressPathname(): boolean {
  if (typeof window === 'undefined') return false;
  return /^\/press(?:\/|$)/i.test(window.location.pathname);
}

function syncBrowserPath(view: SiteView): void {
  if (typeof window === 'undefined') return;
  if (!window.location.protocol.startsWith('http')) return;
  try {
    const targetPath = view === 'press' ? '/press' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
    }
  } catch {
    // Ignore history restrictions in sandboxed iframes / previews
  }
}

export type ThemeMode = 'dark' | 'light';

declare global {
  interface Window {
    __setBocaScroll?: (progress: number) => void;
    __setBocaView?: (view: SiteView) => void;
    __setBocaTheme?: (theme: ThemeMode) => void;
    __setBocaGold?: (gold: boolean) => void;
    __setBocaHotspot?: (hotspot: ScienceHotspotId | null) => void;
  }
}

export function App() {
  const hostRef = useRef<HTMLElement | null>(null);
  const scrollTargetRef = useRef(0);
  const scrollCurrentRef = useRef(0);
  const scrollSettleTargetRef = useRef<number | null>(0);
  const lastWheelTimeRef = useRef(0);
  const glideRef = useRef<{
    from: number;
    to: number;
    startTime: number;
    durationMs: number;
  } | null>(null);

  const [theme, setTheme] = useState<ThemeMode>('light');
  const goldWordmark = false;
  const [activeView, setActiveView] = useState<SiteView>(() =>
    isPressPathname() ? 'press' : 'home',
  );
  const [viewEnterDelay, setViewEnterDelay] = useState(0);
  const [scienceVisitKey, setScienceVisitKey] = useState(0);
  const [designVisitKey, setDesignVisitKey] = useState(0);
  const storyScrollProgressRef = useRef(0);
  const shopScrollProgressRef = useRef(0);
  const [activeHotspot, setActiveHotspot] = useState<ScienceHotspotId | null>(
    null,
  );
  const hotspotPositionsRef = useRef<
    Record<ScienceHotspotId, { x: number; y: number; visible: boolean }>
  >({
    lid: { x: 0, y: 0, visible: false },
    formula: { x: 0, y: 0, visible: false },
    vessel: { x: 0, y: 0, visible: false },
    punt: { x: 0, y: 0, visible: false },
  });
  const [introComplete, setIntroComplete] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      isPressPathname() ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  });
  const [directReturn, setDirectReturn] = useState(false);
  const [stageHiddenForReturn, setStageHiddenForReturn] = useState(false);
  const directReturnTimerRef = useRef<number | null>(null);
  const directReturnFadeTimerRef = useRef<number | null>(null);
  const directReturnResetTimerRef = useRef<number | null>(null);
  const [fontLoadRevision, setFontLoadRevision] = useState(0);
  const [selectedPack, setSelectedPack] = useState<ShopItemId>('1-pack');
  const [hoveredPack, setHoveredPack] = useState<ShopItemId | null>(null);
  const [packExpanded, setPackExpanded] = useState(false);

  const activeViewRef = useRef<SiteView>(activeView);
  activeViewRef.current = activeView;

  const activeFont =
    FONT_CANDIDATES.find((c) => c.id === DEFAULT_SERIF_ID) ??
    FONT_CANDIDATES[0];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onPopState = () => {
      if (isPressPathname()) {
        setIntroComplete(true);
        setActiveView('press');
        storyScrollProgressRef.current = 0;
      } else if (activeViewRef.current === 'press') {
        setActiveView('home');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    applySerifFontToDocument(DEFAULT_SERIF_ID);
    void loadSerifFont(DEFAULT_SERIF_ID).then(() => {
      if (!cancelled) {
        setFontLoadRevision((v) => v + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 12s non-WebGL safety fallback so Hero UI never reveals prematurely on slow/headless GPUs while 116px loader spins
  useEffect(() => {
    if (introComplete) return;
    const timer = window.setTimeout(() => {
      setIntroComplete(true);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [introComplete]);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  // Exact coastal-drive virtual wheel / touch / keyboard scroll engine with 4-beat settle (Home view)
  useEffect(() => {
    let rafId = 0;
    let prevNow = performance.now();
    let touchStartY = 0;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const easeInOutQuint = (t: number) =>
      t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

    const jumpTo = (target: number) => {
      const clamped = clamp01(target);
      glideRef.current = null;
      scrollTargetRef.current = clamped;
      scrollSettleTargetRef.current = clamped;
      lastWheelTimeRef.current = 0;
    };

    window.__setBocaScroll = (p: number) => {
      const clamped = clamp01(p);
      setIntroComplete(true);
      glideRef.current = null;
      scrollTargetRef.current = clamped;
      scrollCurrentRef.current = clamped;
      scrollSettleTargetRef.current = clamped;
      lastWheelTimeRef.current = 0;
      if (hostRef.current) {
        hostRef.current.style.setProperty('--scroll-p', clamped.toFixed(5));
      }
    };

    window.__setBocaView = (view: SiteView) => {
      const normalized: SiteView =
        view === 'about' || view === 'story' ? 'science' : view;
      const prev = activeViewRef.current;
      setIntroComplete(true);
      setViewEnterDelay(prev === 'shop' && normalized !== 'shop' ? 0.48 : 0.14);
      setActiveView(normalized);
      setActiveHotspot(null);
      storyScrollProgressRef.current = normalized === 'design' ? 1 : 0;
      shopScrollProgressRef.current = 0;
      if (normalized === 'home' && prev !== 'home') {
        glideRef.current = null;
        scrollTargetRef.current = 0;
        scrollCurrentRef.current = 0;
        scrollSettleTargetRef.current = 0;
        lastWheelTimeRef.current = 0;
        if (hostRef.current) {
          hostRef.current.style.setProperty('--scroll-p', '0.00000');
        }
      }
    };

    window.__setBocaHotspot = (hotspot: ScienceHotspotId | null) => {
      setActiveHotspot(hotspot);
    };

    window.__setBocaTheme = (nextTheme: ThemeMode) => {
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };

    window.__setBocaGold = () => {
      // Reflective 24k gold wordmark is permanently enabled
    };

    const onWheel = (e: WheelEvent) => {
      if (activeViewRef.current !== 'home') return;
      e.preventDefault();
      if (glideRef.current) return;
      const step = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      scrollTargetRef.current = clamp01(
        scrollTargetRef.current + step * 0.00065,
      );
      lastWheelTimeRef.current = performance.now();
      scrollSettleTargetRef.current = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (activeViewRef.current !== 'home') return;
      if (glideRef.current) return;
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeViewRef.current !== 'home') return;
      if (glideRef.current) return;
      if (e.touches.length === 0) return;
      const y = e.touches[0].clientY;
      const deltaY = touchStartY - y;
      touchStartY = y;
      scrollTargetRef.current = clamp01(
        scrollTargetRef.current + deltaY * 0.0014,
      );
      lastWheelTimeRef.current = performance.now();
      scrollSettleTargetRef.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (activeViewRef.current !== 'home') return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        const nextIdx = Math.min(
          SCROLL_STOPS.length - 1,
          Math.round(scrollTargetRef.current * (SCROLL_STOPS.length - 1)) + 1,
        );
        jumpTo(SCROLL_STOPS[nextIdx]);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const prevIdx = Math.max(
          0,
          Math.round(scrollTargetRef.current * (SCROLL_STOPS.length - 1)) - 1,
        );
        jumpTo(SCROLL_STOPS[prevIdx]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        jumpTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        jumpTo(1);
      }
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000));
      prevNow = now;

      const activeGlide = glideRef.current;
      if (activeGlide) {
        const u = clamp01((now - activeGlide.startTime) / activeGlide.durationMs);
        const eased = easeInOutQuint(u);
        const val = activeGlide.from + (activeGlide.to - activeGlide.from) * eased;
        scrollTargetRef.current = val;
        scrollCurrentRef.current = val;
        scrollSettleTargetRef.current = activeGlide.to;
        if (u >= 1) {
          scrollTargetRef.current = activeGlide.to;
          scrollCurrentRef.current = activeGlide.to;
          glideRef.current = null;
        }
      } else {
        if (now - lastWheelTimeRef.current > 160) {
          if (scrollSettleTargetRef.current === null) {
            let nearest: number = SCROLL_STOPS[0];
            let minDist = Math.abs(scrollTargetRef.current - nearest);
            for (let i = 1; i < SCROLL_STOPS.length; i++) {
              const d = Math.abs(scrollTargetRef.current - SCROLL_STOPS[i]);
              if (d < minDist) {
                minDist = d;
                nearest = SCROLL_STOPS[i];
              }
            }
            scrollSettleTargetRef.current = nearest;
          }
          const settle = scrollSettleTargetRef.current;
          if (Math.abs(scrollTargetRef.current - settle) > 1e-4) {
            scrollTargetRef.current +=
              (settle - scrollTargetRef.current) * (1 - Math.exp(-5.5 * dt));
          } else {
            scrollTargetRef.current = settle;
          }
        }

        scrollCurrentRef.current +=
          (scrollTargetRef.current - scrollCurrentRef.current) *
          (1 - Math.exp(-4.8 * dt));
      }

      const cur = scrollCurrentRef.current;
      if (hostRef.current) {
        hostRef.current.style.setProperty('--scroll-p', cur.toFixed(5));
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      delete window.__setBocaScroll;
      delete window.__setBocaView;
      delete window.__setBocaTheme;
      delete window.__setBocaGold;
      delete window.__setBocaHotspot;
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleJumpToProgress = useCallback(
    (target: number, durationMs?: number) => {
      const clamped = Math.max(0, Math.min(1, target));
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      if (durationMs && durationMs > 0 && !reducedMotion) {
        glideRef.current = {
          from: scrollCurrentRef.current,
          to: clamped,
          startTime: performance.now(),
          durationMs,
        };
        scrollSettleTargetRef.current = clamped;
        lastWheelTimeRef.current = 0;
        return;
      }
      glideRef.current = null;
      scrollTargetRef.current = clamped;
      scrollSettleTargetRef.current = clamped;
      lastWheelTimeRef.current = 0;
    },
    [],
  );

  const clearReturnTimers = useCallback(() => {
    if (directReturnTimerRef.current !== null) {
      window.clearTimeout(directReturnTimerRef.current);
      directReturnTimerRef.current = null;
    }
    if (directReturnFadeTimerRef.current !== null) {
      window.clearTimeout(directReturnFadeTimerRef.current);
      directReturnFadeTimerRef.current = null;
    }
    if (directReturnResetTimerRef.current !== null) {
      window.clearTimeout(directReturnResetTimerRef.current);
      directReturnResetTimerRef.current = null;
    }
  }, []);

  const handleDirectReturnToTop = useCallback(() => {
    clearReturnTimers();
    glideRef.current = null;
    // Trigger BottleScene's calm, drawn-out 1.55s direct glide & softly dissolve Beat 4 (0..420ms)
    setDirectReturn(true);
    setStageHiddenForReturn(true);
    // Reset scroll silently to 0.00 once Beat 4 has faded out (440ms) so Beats 2 & 3 never flash past
    directReturnResetTimerRef.current = window.setTimeout(() => {
      directReturnResetTimerRef.current = null;
      scrollTargetRef.current = 0;
      scrollCurrentRef.current = 0;
      scrollSettleTargetRef.current = 0;
      lastWheelTimeRef.current = 0;
      if (hostRef.current) {
        hostRef.current.style.setProperty('--scroll-p', '0.00000');
      }
    }, 440);
    // Softly bloom Beat 1 back in (980..1580ms) as the calm direct glide settles into Beat 1
    directReturnFadeTimerRef.current = window.setTimeout(() => {
      directReturnFadeTimerRef.current = null;
      setStageHiddenForReturn(false);
    }, 980);
    directReturnTimerRef.current = window.setTimeout(() => {
      directReturnTimerRef.current = null;
      setDirectReturn(false);
    }, 1580);
  }, [clearReturnTimers]);

  useEffect(() => {
    return () => {
      clearReturnTimers();
    };
  }, [clearReturnTimers]);

  const handleSelectView = useCallback(
    (view: SiteView) => {
      const normalized: SiteView =
        view === 'about' || view === 'story' ? 'science' : view;
      const prevView = activeViewRef.current;

      // Clicking the already-active non-home tab shouldn't remount or flicker
      if (normalized === prevView && normalized !== 'home') {
        return;
      }

      // Clicking the top-left logo while already on Home smoothly returns to Beat 1
      if (normalized === 'home' && prevView === 'home') {
        if (scrollCurrentRef.current > 0.68) {
          handleDirectReturnToTop();
        } else if (scrollCurrentRef.current > 0.02) {
          handleJumpToProgress(0, 1050);
        }
        return;
      }

      clearReturnTimers();
      setDirectReturn(false);
      setStageHiddenForReturn(false);

      // When leaving Shop, hold incoming view briefly so Shop's sequential reverse fade-out finishes first
      setViewEnterDelay(prevView === 'shop' ? 0.65 : 0.14);
      setActiveView(normalized);
      syncBrowserPath(normalized);

      if (normalized !== 'design') {
        setActiveHotspot(null);
      }
      if (normalized === 'science') {
        setScienceVisitKey((k) => k + 1);
      } else if (normalized === 'design') {
        setDesignVisitKey((k) => k + 1);
      }

      if (normalized === 'design') {
        storyScrollProgressRef.current = 1;
      } else if (normalized === 'science' || normalized === 'press') {
        storyScrollProgressRef.current = 0;
      }
      shopScrollProgressRef.current = 0;

      // Never snap Home's scroll backwards while Home is fading out; only reset cleanly
      // to Beat 1 when returning to Home from another section.
      if (normalized === 'home') {
        glideRef.current = null;
        scrollTargetRef.current = 0;
        scrollCurrentRef.current = 0;
        scrollSettleTargetRef.current = 0;
        lastWheelTimeRef.current = 0;
        if (hostRef.current) {
          hostRef.current.style.setProperty('--scroll-p', '0.00000');
        }
        setPackExpanded(false);
      } else if (normalized === 'shop') {
        setPackExpanded(false);
      }
    },
    [clearReturnTimers, handleDirectReturnToTop, handleJumpToProgress],
  );

  const handleScienceStopChange = useCallback((stop: 0 | 1) => {
    setActiveView((prev) => {
      if (prev === 'home' || prev === 'shop') return prev;
      return stop === 1 ? 'design' : 'science';
    });
  }, []);

  const handleStoryScrollProgress = useCallback((p: number) => {
    storyScrollProgressRef.current = p;
  }, []);

  const handleShopScrollProgress = useCallback((p: number) => {
    shopScrollProgressRef.current = p;
  }, []);

  const handleSelectPack = useCallback((itemId: ShopItemId) => {
    setSelectedPack(itemId);
    setPackExpanded(itemId === '6-pack' || itemId === '24-pack');
  }, []);

  const handleToggleExpand = useCallback(() => {
    setPackExpanded((prev) => !prev);
  }, []);

  const handleCanTap = useCallback(() => {
    if (activeView === 'shop' && selectedPack !== '1-pack') {
      setPackExpanded((prev) => !prev);
    }
  }, [activeView, selectedPack]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const renderWordmark = useCallback(
    (fontFamily: string, textCase?: WordmarkCase) => {
      void fontLoadRevision;
      return renderWordmarkCanvas(fontFamily, textCase ?? 'upper');
    },
    [fontLoadRevision],
  );

  const renderWordmarkSide = useCallback(
    (
      side: 'front' | 'back',
      fontFamily?: string,
      existingCanvas?: HTMLCanvasElement,
      color?: string,
    ) => {
      void fontLoadRevision;
      return renderWordmarkSideCanvas(side, fontFamily, existingCanvas, color);
    },
    [fontLoadRevision],
  );

  const effectivePackMode: PackMode =
    activeView === 'shop' &&
    (selectedPack === '1-pack' ||
      selectedPack === '6-pack' ||
      selectedPack === '24-pack')
      ? selectedPack
      : '1-pack';
  const effectivePackExpanded = activeView === 'shop' && packExpanded;

  const isScienceDesignView =
    activeView === 'story' ||
    activeView === 'science' ||
    activeView === 'design' ||
    activeView === 'about';

  return (
    <main
      ref={hostRef}
      data-theme={theme}
      className="relative h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]"
    >
      <div className="fixed inset-0 z-0">
        <BottleScene
          fontFamily={activeFont.canvasFontFamily}
          textCase="upper"
          renderWordmarkCanvas={renderWordmark}
          renderWordmarkSideCanvas={renderWordmarkSide}
          lightingPreset="studio-dark"
          theme={theme}
          goldWordmark={goldWordmark}
          viewMode={
            activeView === 'about' || activeView === 'story'
              ? 'science'
              : activeView
          }
          packMode={effectivePackMode}
          packExpanded={effectivePackExpanded}
          hoveredPack={activeView === 'shop' ? hoveredPack : null}
          onCanTap={handleCanTap}
          scrollProgressRef={scrollCurrentRef}
          storyScrollProgressRef={storyScrollProgressRef}
          shopScrollProgressRef={shopScrollProgressRef}
          activeHotspot={isScienceDesignView ? activeHotspot : null}
          hotspotPositionsRef={hotspotPositionsRef}
          directReturn={directReturn}
          onIntroComplete={handleIntroComplete}
          interactive
        />
      </div>

      <div
        style={{
          opacity: introComplete ? 1 : 0,
          transition: 'opacity 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={introComplete ? '' : 'pointer-events-none'}
      >
      <Navbar
        activeView={activeView}
        goldWordmark={goldWordmark}
        onSelectView={handleSelectView}
      />

      <AnimatePresence>
        {activeView === 'home' && (
          <motion.div
            key="home-stage"
            initial={introComplete ? { opacity: 0, y: 14 } : false}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.82,
                delay: viewEnterDelay,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            exit={{
              opacity: 0,
              y: -10,
              pointerEvents: 'none',
              transition: { duration: 0.48, ease: LUXURY_EASE },
            }}
            className="fixed inset-0 z-20 pointer-events-none"
          >
            <KineticParallaxStage
              hostRef={hostRef}
              onJumpToProgress={handleJumpToProgress}
              onDirectReturnToTop={handleDirectReturnToTop}
              directReturn={stageHiddenForReturn}
              goldWordmark={goldWordmark}
            />
          </motion.div>
        )}

        {activeView === 'shop' && (
          <ShopView
            key="shop-view"
            selectedPack={selectedPack}
            packExpanded={packExpanded}
            goldWordmark={goldWordmark}
            enterDelay={viewEnterDelay}
            onSelectPack={handleSelectPack}
            onToggleExpand={handleToggleExpand}
            onHoverPack={setHoveredPack}
            onScrollProgress={handleShopScrollProgress}
          />
        )}

        {isScienceDesignView && (
          <AboutView
            key={
              activeView === 'design'
                ? `design-view-${designVisitKey}`
                : `science-view-${scienceVisitKey}`
            }
            mode={activeView === 'design' ? 'design' : 'science'}
            targetStop={activeView === 'design' ? 1 : 0}
            enterDelay={viewEnterDelay}
            onStopChange={handleScienceStopChange}
            onScrollProgress={handleStoryScrollProgress}
            activeHotspot={activeHotspot}
            onSelectHotspot={setActiveHotspot}
            hotspotPositionsRef={hotspotPositionsRef}
            goldWordmark={goldWordmark}
          />
        )}

        {activeView === 'press' && (
          <PressView key="press-view" enterDelay={viewEnterDelay} />
        )}
      </AnimatePresence>

      {/* Minimal bottom-right Dark/Light mode toggle (reflective 24k gold always active) */}
      <div className="orbs-corner-controls">
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-label={
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
          }
          className="orbs-theme-toggle"
        >
        {theme === 'dark' ? (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
        </button>
      </div>
      </div>
    </main>
  );
}

export default App;
